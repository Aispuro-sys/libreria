/**
 * Descarga libros/manuales/revistas en español desde Archive.org
 * a public/libros/espanol/. Uso: node scripts/fetch-espanol.mjs
 */
import { mkdirSync, existsSync, statSync, createWriteStream } from "fs";
import { join } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const OUT = "public/libros/espanol";
const IA = "https://archive.org/download";

// [id archive.org, archivo dentro del item, nombre local]
const ITEMS = [
  // Supervivencia y combate
  ["ManualDeSupervivenciaJBoswellMartinezRoca1984", "Manual de Supervivencia J Boswell Martinez Roca 1984_text.pdf", "manual-supervivencia-boswell.pdf"],
  ["comando-tecnicas-de-combate-y-supervivencia-vol-1-planeta-1988", "Comando Tecnicas de Combate y Supervivencia vol 1 Planeta 1988_text.pdf", "comando-supervivencia-vol1.pdf"],
  ["comando-tecnicas-de-combate-y-supervivencia-vol-2-planeta-1988", "Comando Tecnicas de Combate y Supervivencia vol 2 Planeta 1988_text.pdf", "comando-supervivencia-vol2.pdf"],
  ["comando-tecnicas-de-combate-y-supervivencia-vol-6-planeta-1988", "Comando Tecnicas de Combate y Supervivencia vol 6 Planeta 1988_text.pdf", "comando-supervivencia-vol6.pdf"],
  // Armas y caza
  ["ArmasDeGuerra001SubfusilesEdisa1991", "Armas de Guerra 001 Subfusiles Edisa 1991.pdf", "armas-guerra-subfusiles.pdf"],
  ["avesderapiaysu00medi", "avesderapiaysu00medi.pdf", "aves-rapina-caza.pdf"],
  // Motores y mecánica
  ["una-guia-paso-a-paso-manual-de-embobinado-de-motores-version-1", "UNA GUIA PASO A PASO Manual de Embobinado de Motores versión 1_text.pdf", "embobinado-motores.pdf"],
  ["reparacion-y-bobinado-de-motores-electricos-fernando-martinez", "Reparacion_y_Bobinado_de_Motores_Electricos_Fernando_Martinez.pdf", "reparacion-motores-electricos.pdf"],
  // Revistas
  ["MecanicaPopularVol40N1Enero1967", "Mecanica Popular - Vol 40 N° 1 - Enero 1967_text.pdf", "mecanica-popular-1967.pdf"],
  ["muy-interesante-spain-n-434-julio-2017", "Muy Interesante Spain N434 Julio 2017.pdf", "muy-interesante-434.pdf"],
  ["MuyInteresante3322009", "MuyInteresante332-2009_text.pdf", "muy-interesante-332.pdf"],
  // Salud y primeros auxilios
  ["primeros-auxilios-psicologicos", "Primeros_auxilios_psicologicos._Egozcue_Romero_Maria_Magdalena_text.pdf", "primeros-auxilios-psicologicos.pdf"],
  ["2020-cpr-manual-spanish", "2022_CPR_Handbook_Spanish.pdf", "rcp-primeros-auxilios.pdf"],
  ["guia-del-explorador-primeros-auxilios", "Guia_del_Explorador-Primeros_Auxilios_text.pdf", "explorador-primeros-auxilios.pdf"],
  // Oficios
  ["ManualCompletoDeLaMaderaLaCarpinteriaYLaEbanisteriaAlbertJackson", "Manual_Completo_de_la_Madera_la_Carpinteria_y_la_Ebanisteria_-_Albert_Jackson_text.pdf", "manual-carpinteria-madera.pdf"],
  ["enciclopedia-de-los-nudos-cristian-biosca-edimat-libros", "Enciclopedia de los Nudos - Cristian Biosca - Edimat Libros.pdf", "enciclopedia-nudos.pdf"],
  ["Soldadura", "Soldadura.pdf", "soldadura.pdf"],
  // Naturaleza
  ["EnciclopediaDePlantasMedicinales.GuiaPracticaDeConsultaConMas550HierbasClaveYSusUsosMedicinales", "Enciclopedia de plantas medicinales. Guía práctica de consulta con más 550 hierbas clave y sus usos medicinales_text.pdf", "plantas-medicinales.pdf"],
];

mkdirSync(OUT, { recursive: true });

for (const [id, file, local] of ITEMS) {
  const dest = join(OUT, local);
  if (existsSync(dest) && statSync(dest).size > 50_000) {
    console.log("ok (ya existe)", local);
    continue;
  }
  const url = `${IA}/${id}/${file.split("/").map(encodeURIComponent).join("/")}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    const mb = (statSync(dest).size / 1e6).toFixed(1);
    if (statSync(dest).size < 50_000) throw new Error("archivo sospechosamente pequeño");
    console.log("ok", local, `(${mb} MB)`);
  } catch (e) {
    console.log("FALLO", local, "—", e.message);
  }
}
console.log("Listo.");
