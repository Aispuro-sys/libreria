/**
 * Descubre libros/manuales/revistas en español en Archive.org por secciones.
 * Genera scripts/discovered.json: [{id, file, title, sizeMB, cat, author, year}]
 * Uso: node scripts/discover-espanol.mjs
 */
import { writeFileSync } from "fs";

const MAX_MB = 90;

// sección -> consultas archive.org
const SECTIONS = {
  "Supervivencia": [
    'title:(supervivencia OR survival OR busqueda y rescate) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(campamento OR montana OR rescate) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Armas": [
    'title:(armas OR fusil OR pistola OR escopeta OR rifle) AND mediatype:texts AND language:(Spanish OR spa)',
    'collection:(ArmasDeGuerra) OR title:(armas de guerra) AND mediatype:texts',
  ],
  "Caza y pesca": [
    'title:(caza OR caceria OR pesca OR pescar) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(cetreria OR cetreria OR halconeria) AND mediatype:texts',
  ],
  "Motores y autos": [
    'title:(motor OR motores OR automovil OR motocicleta) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(diesel OR gasolina OR carburador OR inyeccion) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Electricidad": [
    'title:(electricidad OR electricista OR instalaciones electricas) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(electronica OR circuitos) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Oficios": [
    'title:(plomeria OR fontaneria OR albanileria OR construccion) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(herreria OR cerrajeria OR pintura OR drywall) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(refrigeracion OR aire acondicionado OR climatizacion) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Cocina": [
    'title:(cocina OR recetas OR reposteria OR panaderia) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(comida mexicana OR cocina mexicana OR gastronomia) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Salud": [
    'title:(primeros auxilios OR enfermeria OR medicina) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(anatomia OR fisiologia OR nutricion) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Naturaleza": [
    'title:(plantas medicinales OR herbolaria OR hierbas) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(agricultura OR cultivo OR huerto OR granja OR ganado OR aves OR abejas OR apicultura) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(veterinaria OR mascotas OR perros OR gatos) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Deportes": [
    'title:(futbol OR boxeo OR karate OR judo OR gimnasia OR atletismo) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(artes marciales OR defensa personal OR taekwondo) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Náutica": [
    'title:(navegacion OR nautica OR embarcacion OR marino OR marinero) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Literatura": [
    'title:(quijote OR cervantes) AND mediatype:texts AND language:(Spanish OR spa) AND year:[1600 TO 1930]',
    'title:(poesia OR novela OR cuentos) AND mediatype:texts AND language:(Spanish OR spa) AND year:[1700 TO 1935]',
  ],
  "Historia": [
    'title:(historia de mexico OR historia de espana OR revolucion) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(prehistoria OR arqueologia OR civilizacion) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Ciencia escolar": [
    'title:(matematicas OR algebra OR geometria OR aritmetica) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(fisica OR quimica OR biologia) AND mediatype:texts AND language:(Spanish OR spa)',
    '(title:(telesecundaria OR telebachillerato OR conalep OR SEP) OR subject:(educacion)) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Tecnología": [
    'title:(computacion OR informatica OR programacion OR internet) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(excel OR word OR office OR windows) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Artes": [
    'title:(dibujo OR pintura OR acuarela OR oleo) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(fotografia OR camara) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(guitarra OR musica OR solfeo OR piano) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(magia OR trucos OR ilusionismo OR origami OR papel) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Ajedrez": [
    'title:(ajedrez) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Autoayuda": [
    'title:(autoayuda OR autoestima OR exito OR liderazgo) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(psicologia OR filosofia) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Economía": [
    'title:(economia OR finanzas OR dinero OR negocios OR emprendimiento) AND mediatype:texts AND language:(Spanish OR spa)',
    'title:(contabilidad OR administracion) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
  "Revistas": [
    'title:(muy interesante) AND mediatype:texts',
    'title:(Mecanica Popular) AND mediatype:texts',
    'title:(national geographic) AND mediatype:texts AND language:(Spanish OR spa)',
  ],
};

const found = new Map();

for (const [cat, queries] of Object.entries(SECTIONS)) {
  const seen = new Set();
  for (const q of queries) {
    const u = "https://archive.org/advancedsearch.php?q=" + encodeURIComponent(q) +
      "&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=year&fl[]=downloads&rows=12&sort[]=downloads+desc&output=json";
    const r = await fetch(u).then(x => x.json()).catch(() => null);
    for (const d of r?.response?.docs || []) {
      if (seen.has(d.identifier)) continue;
      seen.add(d.identifier);
      // metadata -> pdf descargable <= MAX_MB
      try {
        const m = await fetch("https://archive.org/metadata/" + d.identifier).then(x => x.json());
        if (m.metadata?.["access-restricted-item"] === "true") continue;
        const pdfs = (m.files || []).filter(f => /\.pdf$/i.test(f.name) && !f.private && !/encrypted|sample/i.test(f.name));
        const best = pdfs.filter(f => (f.size || 0) <= MAX_MB * 1e6).sort((a, b) => (b.size || 0) - (a.size || 0))[0];
        if (!best) continue;
        const rec = {
          id: d.identifier, file: decodeURIComponent(best.name), cat,
          title: d.title || d.identifier, author: d.creator || "",
          year: d.year || "", sizeMB: Math.round((best.size || 0) / 1e6),
        };
        const prev = found.get(d.identifier);
        if (!prev || (d.downloads || 0) > prev.dl) found.set(d.identifier, { ...rec, dl: d.downloads || 0 });
        process.stdout.write("+");
      } catch { process.stdout.write("x"); }
    }
  }
  console.log("\n[" + cat + "]");
}

const list = [...found.values()].sort((a, b) => b.dl - a.dl);
writeFileSync("scripts/discovered.json", JSON.stringify(list, null, 2));
console.log("\nTotal candidatos:", list.length);
for (const r of list.slice(0, 40)) console.log(" ", r.cat.padEnd(18), r.sizeMB + "MB", r.title.slice(0, 55));
