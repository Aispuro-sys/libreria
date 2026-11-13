/**
 * Descarga masiva curada de libros/manuales/revistas en español desde
 * Archive.org -> public/libros/espanol/. Genera además
 * src/data/spanishBooks.gen.js con las entradas del catálogo.
 * Uso: node scripts/fetch-espanol2.mjs
 *
 * El nombre de archivo dentro del item se resuelve solo (mejor PDF ≤95MB)
 * salvo que empiece por "@", que indica nombre explícito (items multi-PDF).
 */
import { mkdirSync, existsSync, statSync, createWriteStream, writeFileSync } from "fs";
import { join } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const OUT = "public/libros/espanol";
const IA = "https://archive.org/download";
const META = "https://archive.org/metadata";
const MAX = 95 * 1e6;

// [id, archivo(@=explícito), nombre local, categoría, título, autor, año, nota]
const ITEMS = [
  // ── Supervivencia ─────────────────────────────────────────────
  ["6-manual-refugios-de-proteccion-civil", "@01. Manual de supervivencia MNC autor Fernando L. Yengle.pdf", "supervivencia-mnc.pdf", "Supervivencia", "Manual de Supervivencia MNC", "Fernando L. Yengle", "", "Manual militar de supervivencia: orientación, agua, fuego y refugio."],
  ["6-manual-refugios-de-proteccion-civil", "@03. Manual de Enseñanza de Supervivencia. Tomo II. Éjercito español de Tierra autor Eventos Target.pdf", "supervivencia-ejercito-tomo2.pdf", "Supervivencia", "Manual de Enseñanza de Supervivencia · Tomo II", "Ejército de Tierra (España)", "", "Manual oficial del Ejército español: instrucción militar en supervivencia."],
  ["6-manual-refugios-de-proteccion-civil", "@04. Supervivencia autor Escuela Española de Supervivencia.pdf", "supervivencia-escuela.pdf", "Supervivencia", "Supervivencia", "Escuela Española de Supervivencia", "", "Manual de la Escuela Española de Supervivencia."],
  ["6-manual-refugios-de-proteccion-civil", "@06. Manual de supervivencia en la selva peruana autor Gran Fratervidad Tao Gnóstica Espiritual.pdf", "supervivencia-selva.pdf", "Supervivencia", "Supervivencia en la Selva Peruana", "Gran Fraternidad Universal", "", "Manual de supervivencia en selva: ríos, plantas, fauna y orientación."],
  ["6-manual-refugios-de-proteccion-civil", "@22. Resistencia, Evasión, Escape y Supervivencia autor Biblioteca ESCOM.pdf", "resistencia-evasion.pdf", "Supervivencia", "Resistencia, Evasión, Escape y Supervivencia", "Biblioteca ESCOM", "", "Técnicas de resistencia, evasión y escape en territorio hostil."],
  ["6-manual-refugios-de-proteccion-civil", "@6 MANUAL REFUGIOS de proteccion civil_text.pdf", "manual-refugios.pdf", "Supervivencia", "Manual de Refugios de Protección Civil", "Protección Civil", "", "Construcción y equipamiento de refugios de protección civil."],
  ["STRATCONTManualDeSupervivencia", "", "stratcont-supervivencia.pdf", "Supervivencia", "Manual de Supervivencia STRATCONT", "STRATCONT", "2016", "Manual de supervivencia en entornos urbanos y naturales."],
  // ── Armas ────────────────────────────────────────────────────
  ["martinez-r.-las-armas-blancas-en-espana-e-indias-1992", "", "armas-blancas.pdf", "Armas", "Las Armas Blancas en España e Indias", "R. Martínez", "1992", "Estudio histórico de espadas, dagas y armas blancas españolas."],
  // ── Caza y pesca ─────────────────────────────────────────────
  ["boletndebosquesp02sant", "", "boletin-bosques-caza.pdf", "Caza y pesca", "Boletín de Bosques, Pesca y Caza", "Servicio Forestal", "", "Boletín clásico sobre bosques, pesca y caza."],
  ["bibliotecavenat01moligoog", "", "biblioteca-venatoria.pdf", "Caza y pesca", "Biblioteca Venatoria", "Gutiérrez de la Vega", "1877", "Tratado clásico de caza mayor y menor en España."],
  // ── Motores y autos ──────────────────────────────────────────
  ["EnciclopediaVisualDeLaMotocicletaTomo1EdicionesMundo", "", "motocicleta-tomo1.pdf", "Motores", "Enciclopedia Visual de la Motocicleta · Tomo 1", "Ediciones Mundo", "", "Enciclopedia ilustrada de la motocicleta: mecánica, historia y modelos."],
  ["EnciclopediaVisualDeLaMotocicletaTomo2EdicionesMundo", "", "motocicleta-tomo2.pdf", "Motores", "Enciclopedia Visual de la Motocicleta · Tomo 2", "Ediciones Mundo", "", "Segundo tomo: reparación, mantenimiento y grandes marcas."],
  ["embobinado-de-motores", "", "embobinado-basico.pdf", "Motores", "Embobinado de Motores", "Luis Lesur · Trillas", "", "Guía básica de embobinado de motores eléctricos."],
  // ── Electricidad ─────────────────────────────────────────────
  ["266539159MaquinasElectricasChapman5taEdicionPdf", "", "maquinas-electricas-chapman.pdf", "Electricidad", "Máquinas Eléctricas", "Stephen J. Chapman", "", "El texto universitario de referencia: transformadores, generadores y motores."],
  ["fundamentos-de-circuitos-electricos", "", "circuitos-sadiku.pdf", "Electricidad", "Fundamentos de Circuitos Eléctricos", "Sadiku · Alexander", "", "Análisis de circuitos eléctricos: teoría, teoremas y ejercicios."],
  ["circuitos-electricos-schaum-pdf_201911", "", "circuitos-schaum.pdf", "Electricidad", "Circuitos Eléctricos (Serie Schaum)", "Joseph Edminister", "", "Serie Schaum: circuitos con cientos de problemas resueltos."],
  ["EnciclopediaDeElectronicaBasica", "", "electronica-basica.pdf", "Electricidad", "Enciclopedia de Electrónica Básica", "Manual técnico", "", "Enciclopedia práctica: componentes, circuitos y proyectos de electrónica."],
  ["maquinas-electricas-6a.-ed.-fraile-mora-jesus.", "", "maquinas-fraile.pdf", "Electricidad", "Máquinas Eléctricas", "Jesús Fraile Mora", "", "Texto español clásico de máquinas eléctricas rotativas y transformadores."],
  ["libroboylestad12ed", "", "circuitos-boylestad.pdf", "Electricidad", "Introducción al Análisis de Circuitos", "Robert L. Boylestad", "", "El Boylestad: análisis de circuitos con enfoque práctico."],
  // ── Oficios ──────────────────────────────────────────────────
  ["ec.cpe.5.9.1.1992", "", "codigo-construccion.pdf", "Oficios", "Código de la Construcción CPE-INEN", "INEN (Ecuador)", "1992", "Normativa de construcción: cimentaciones, muros, estructuras."],
  ["diccionariodecon01cueruoft", "", "diccionario-construccion.pdf", "Oficios", "Diccionario de Construcción", "M. Cuervo", "", "Diccionario técnico de construcción y régimen de la propiedad."],
  ["397043552-guia-del-aficionado-carpinteria-pdf-1", "", "guia-carpinteria.pdf", "Carpintería", "Guía del Aficionado: Carpintería", "Plesa", "1981", "Guía práctica de carpintería para aficionados."],
  // ── Cocina ───────────────────────────────────────────────────
  ["el-gran-libro-de-la-cocina-mexicana", "", "cocina-mexicana.pdf", "Cocina", "El Gran Libro de la Cocina Mexicana", "Varios autores", "", "La cocina mexicana completa: antojitos, moles, postres y recetas regionales."],
  ["1080-recetas-cocina", "", "1080-recetas.pdf", "Cocina", "1080 Recetas de Cocina", "Simone Ortega", "", "El libro de cocina española más famoso: 1080 recetas paso a paso."],
  ["cocina-prehispanica", "", "cocina-prehispanica.pdf", "Cocina", "Cocina Prehispánica", "Heriberto García Rivas", "", "La cocina antes de la Colonia: ingredientes y técnicas prehispánicas."],
  ["elpracticntrat00muro", "", "el-practicon.pdf", "Cocina", "El Practicón: Tratado Completo de Cocina", "Ángel Muro", "1894", "Clásico de la cocina española del siglo XIX."],
  ["lacocinerapobla00unkngoog", "", "cocinera-poblana.pdf", "Cocina", "La Cocinera Poblana", "Anónimo", "1881", "Primer recetario impreso de México: la cocina poblana tradicional."],
  // ── Salud ────────────────────────────────────────────────────
  ["AnatomaHumanaT1Rouviere11aEd", "", "anatomia-rouviere-t1.pdf", "Salud", "Anatomía Humana · Tomo 1", "Henri Rouvière", "", "El atlas de anatomía de referencia: cabeza, cuello y tronco."],
  ["atlasvisualdeanatomia", "", "atlas-anatomia.pdf", "Salud", "Atlas Visual de Anatomía", "Equipo editorial", "", "Atlas ilustrado del cuerpo humano con láminas a color."],
  ["burton-r.-anatomia-de-la-melancolia-epl-fs-1621-2023", "", "anatomia-melancolia.pdf", "Salud", "Anatomía de la Melancolía", "Robert Burton", "1621", "El clásico sobre la melancolía, la mente y las pasiones humanas."],
  // ── Naturaleza ───────────────────────────────────────────────
  ["PlantasDeLosDioses", "", "plantas-de-los-dioses.pdf", "Naturaleza", "Plantas de los Dioses", "Schultes · Hofmann", "", "Orígenes del uso de plantas alucinógenas en las culturas del mundo."],
  ["manualdelasplant00pitt", "", "plantas-venezuela.pdf", "Naturaleza", "Manual de las Plantas Usuales de Venezuela", "H. Pittier", "1926", "Manual botánico clásico de las plantas de Venezuela."],
  ["arboriculturayfl00jft", "", "arboricultura-cubana.pdf", "Naturaleza", "Arboricultura y Floricultura Cubana", "J. F. T.", "", "Descripción de árboles y flores de Cuba."],
  ["albumdelaflor00arge", "", "album-flora-medica.pdf", "Naturaleza", "Álbum de la Flora Médico-Farmacéutica", "Anónimo", "", "Álbum ilustrado de plantas medicinales e industriales."],
  ["ArboretoCholul", "", "frutales-mayas.pdf", "Naturaleza", "Arboreto Cholul: Frutales Mayas", "Proyecto Cholul", "", "Rescate documental de los frutales tradicionales mayas."],
  // ── Deportes ─────────────────────────────────────────────────
  ["pc-futbol-revistas", "", "pc-futbol-revistas.pdf", "Deportes", "PC Fútbol: Revistas de la Saga", "Dinamic Multimedia", "", "Compilación de revistas del legendario juego de fútbol español."],
  ["gimnasiaescolars00banc", "", "gimnasia-escolar.pdf", "Deportes", "Gimnasia Escolar sin Aparatos", "Banchs", "", "Ejercicios de gimnasia escolar sin aparatos, ilustrados."],
  // ── Náutica ──────────────────────────────────────────────────
  ["boletinuniondelmarino1920-1921", "", "boletin-marino.pdf", "Náutica", "Boletín de la Unión del Marino 1920-1921", "Unión del Marino (Argentina)", "1921", "Boletín histórico de la unión naval argentina."],
  ["bub_gb_GRwVOYjAL0YC", "", "tablas-navegacion.pdf", "Náutica", "Tablas para los Usos de la Navegación", "Anónimo", "1856", "Colección completa de tablas de navegación."],
  ["riobermejo", "", "navegacion-bermejo.pdf", "Náutica", "Historia de la Navegación del Río Bermejo", "Anónimo", "", "Historia de la navegación fluvial del río Bermejo."],
  // ── Literatura ───────────────────────────────────────────────
  ["donquijotedelam00cerv", "", "don-quijote.pdf", "Literatura", "Don Quijote de la Mancha", "Miguel de Cervantes", "1605", "La obra cumbre de la literatura en español."],
  ["CuentosDeLosHermanosGrimm", "", "cuentos-grimm.pdf", "Literatura", "Cuentos de los Hermanos Grimm", "Hermanos Grimm", "", "Los cuentos completos de Grimm."],
  ["meditacionesdelq00orte", "", "meditaciones-quijote.pdf", "Literatura", "Meditaciones del Quijote", "José Ortega y Gasset", "1914", "Ensayos fundacionales de Ortega sobre el Quijote y la cultura española."],
  ["nadamenosquetodo00unamuoft", "", "nada-menos-unamuno.pdf", "Literatura", "Nada menos que todo un hombre", "Miguel de Unamuno", "1916", "Novela corta de Unamuno."],
  ["rebelion-en-la-granja", "", "rebelion-granja.pdf", "Literatura", "Rebelión en la Granja", "George Orwell", "1945", "La fábula política de Orwell sobre la revolución traicionada."],
  // ── Historia ─────────────────────────────────────────────────
  ["gribbin-john.-historia-de-la-ciencia-1543-2001-epl-fs-2019", "", "historia-ciencia.pdf", "Historia", "Historia de la Ciencia 1543-2001", "John Gribbin", "2019", "Panorama de la ciencia moderna desde Copérnico hasta el genoma."],
  ["historiadelasind02dur", "", "historia-indias-duran.pdf", "Historia", "Historia de las Indias de Nueva España", "Fray Diego Durán", "", "Crónica fundamental de la Nueva España, tomo 2."],
  ["CATEDRA_DE_FLAMENCOLOGIA_DE_JEREZ-HISTORIA", "", "historia-flamenco.pdf", "Historia", "Cátedra de Flamencología de Jerez", "Cátedra de Flamencología", "", "Historia del flamenco desde Jerez."],
  ["diamond-jared.-armas-germenes-y-acero-epl-fs-2019", "", "armas-germenes-acero.pdf", "Historia", "Armas, Gérmenes y Acero", "Jared Diamond", "2019", "Por qué unas sociedades dominaron a otras: geografía, gérmenes y tecnología."],
  // ── Ciencia escolar ──────────────────────────────────────────
  ["biologia-celular-y-molecular-de-robertis-16e", "", "biologia-robertis.pdf", "Ciencia escolar", "Biología Celular y Molecular", "De Robertis", "", "El texto universitario de biología celular."],
  ["libro-de-quimica-raymond-chang-12va-edi", "", "quimica-chang.pdf", "Ciencia escolar", "Química", "Raymond Chang", "", "El manual general de química más usado en Latinoamérica."],
  ["algebralineal7maedicionstanleyl.grossman", "", "algebra-grossman.pdf", "Ciencia escolar", "Álgebra Lineal", "Stanley L. Grossman", "", "Texto clásico en español de álgebra lineal."],
  ["Quimica9naEdSchaum", "", "quimica-schaum.pdf", "Ciencia escolar", "Química (Serie Schaum)", "Schaum", "", "Química general con problemas resueltos."],
  ["Precalculo-Matematicas-para-el-calculo-Septima-edicion", "", "precalculo.pdf", "Ciencia escolar", "Precálculo: Matemáticas para el Cálculo", "Stewart · Redlin · Watson", "", "Funciones, trigonometría y preparación para el cálculo."],
  ["PsicologiaEducativaWoolfolk", "", "psicologia-educativa.pdf", "Ciencia escolar", "Psicología Educativa", "Anita Woolfolk", "", "Texto universitario de psicología educativa."],
  ["solucionario-fisica-universitaria-13-edicion.pdf", "", "fisica-solucionario.pdf", "Ciencia escolar", "Física Universitaria: Solucionario", "Sears · Zemansky", "", "Solucionario del clásico Física Universitaria."],
  // ── Tecnología ───────────────────────────────────────────────
  ["pci-es-061", "", "pci-061.pdf", "Tecnología", "Personal Computer & Internet N°61", "PC&I", "", "Revista española de informática: software, trucos e internet."],
  ["pci-es-074", "", "pci-074.pdf", "Tecnología", "Personal Computer & Internet N°74", "PC&I", "", "Edición 74 de la revista PC&I."],
  ["pci-es-097", "", "pci-097.pdf", "Tecnología", "Personal Computer & Internet N°97", "PC&I", "", "Edición 97 de la revista PC&I."],
  ["progrtomo1b", "", "kali-linux.pdf", "Tecnología", "Internet con Kali Linux", "Anónimo", "", "Guía práctica de seguridad ofensiva y auditoría con Kali Linux."],
  ["EjerciciosResueltosDeProgramacionLineal", "", "programacion-lineal.pdf", "Tecnología", "Ejercicios Resueltos de Programación Lineal", "Material docente", "", "Problemas resueltos de programación lineal e investigación de operaciones."],
  ["hacerradioguiaintegralmarioportugalhectoryudchak", "", "hacer-radio.pdf", "Tecnología", "Hacer Radio: Guía Integral", "Portugal · Yudchak", "", "Guía completa para producir radio: guion, locución y realización."],
  ["libros_musica", "@262179723-PRODUCCION-MUSICAL-pdf.pdf", "produccion-musical.pdf", "Tecnología", "Producción Musical y Audio Digital", "Varios autores", "", "Manual de producción musical e informática de audio."],
  // ── Artes ────────────────────────────────────────────────────
  ["MetodoCompletoDePianoBasicoAAvanzado", "", "metodo-piano.pdf", "Artes", "Método Completo de Piano", "Método", "", "De básico a avanzado: método progresivo de piano."],
  ["JulioSalvadorSagrerasLasPrimerasLeccionesDeGuitarra", "", "sagreras-guitarra.pdf", "Artes", "Las Primeras Lecciones de Guitarra", "Julio S. Sagreras", "1910", "Método clásico de guitarra de Sagreras."],
  ["manualdetrucosfamilynes", "", "trucos-nes.pdf", "Artes", "Manual de Trucos Family NES", "Revista técnica", "", "Trucos y secretos del Family/NES, edición retro."],
  ["ec.cpe.003.1989", "", "dibujo-tecnico.pdf", "Artes", "Código de Dibujo Técnico CPE-INEN 003", "INEN (Ecuador)", "1989", "Normas de dibujo técnico mecánico."],
  // ── Ajedrez ──────────────────────────────────────────────────
  ["24leccionesdeajedrezgarrikasparov", "", "ajedrez-kasparov.pdf", "Ajedrez", "24 Lecciones de Ajedrez", "Garry Kasparov", "", "Curso de ajedrez del campeón mundial Kasparov."],
  ["LaEnsenanzaDelAjedrez.DidacticaDelGradoCompleto", "", "ensenanza-ajedrez.pdf", "Ajedrez", "La Enseñanza del Ajedrez", "Didáctica del ajedrez", "", "Método didáctico completo para enseñar ajedrez."],
  ["elajedrezinvest00bellgoog", "", "ajedrez-origen.pdf", "Ajedrez", "El Ajedrez: Investigaciones sobre su Origen", "Bell", "", "Investigación histórica sobre el origen del ajedrez."],
  ["2013AjedrezParaLaEnseanzaPrimaria", "", "ajedrez-primaria.pdf", "Ajedrez", "Ajedrez para la Enseñanza Primaria", "Material escolar", "2013", "Ajedrez como herramienta didáctica en primaria."],
  // ── Autoayuda y filosofía ────────────────────────────────────
  ["psicologiadelcolor_201907", "", "psicologia-color.pdf", "Autoayuda", "Psicología del Color", "Eva Heller", "", "Cómo los colores afectan las emociones y decisiones."],
  ["russell-bertrand-historia-de-la-filosofia-occidental", "", "filosofia-russell.pdf", "Autoayuda", "Historia de la Filosofía Occidental", "Bertrand Russell", "", "El recorrido de Russell por toda la filosofía occidental."],
  ["descubrir-la-filosofia-coleccion", "", "descubrir-filosofia.pdf", "Autoayuda", "Descubrir la Filosofía", "Colección", "", "Introducción visual a los grandes filósofos."],
  ["AbbagnanoDiccionarioDeFilosofia2a", "", "diccionario-filosofia.pdf", "Autoayuda", "Diccionario de Filosofía", "Nicola Abbagnano", "", "El diccionario filosófico de referencia en español."],
  // ── Economía ─────────────────────────────────────────────────
  ["mankiwprincipiosdeeconomia7maedicion2017", "", "mankiw-economia.pdf", "Economía", "Principios de Economía", "N. Gregory Mankiw", "2017", "El manual de economía más usado del mundo."],
  ["el-cuadrante-del-flujo-de-dinero-robert", "", "cuadrante-dinero.pdf", "Economía", "El Cuadrante del Flujo del Dinero", "Robert Kiyosaki", "", "Empleado, autoempleado, dueño e inversionista: el modelo de Kiyosaki."],
  ["ESTADISTICAAPLICADAALOSNEGOCIOS15ED", "", "estadistica-negocios.pdf", "Economía", "Estadística Aplicada a los Negocios", "Lind · Marchal", "", "Estadística para decisiones empresariales."],
  ["murphy-joseph-como-atraer-el-dinero", "", "atraer-dinero.pdf", "Economía", "Cómo Atraer el Dinero", "Joseph Murphy", "", "Clásico de la mentalidad de abundancia."],
  // ── Revistas ─────────────────────────────────────────────────
  ["mecanicapopularmarzo1978", "", "mecanica-popular-1978.pdf", "Revistas", "Mecánica Popular — Marzo 1978", "Mecánica Popular", "1978", "Edición de 1978: autos, inventos y bricolaje."],
  ["MecanicaPopularVol42N6Junio1968", "", "mecanica-popular-1968.pdf", "Revistas", "Mecánica Popular N°42-6 — Junio 1968", "Mecánica Popular", "1968", "Número de 1968 de la revista de tecnología popular."],
  ["NationalGeographicEnEspanol-Septiembre2016", "", "natgeo-2016.pdf", "Revistas", "National Geographic en Español — Sept. 2016", "National Geographic", "2016", "Edición en español de National Geographic."],
  ["especial-historia-national-geographic-dossieres-10", "", "natgeo-historia.pdf", "Revistas", "National Geographic: Dossieres de Historia N°10", "National Geographic", "", "Dossier especial de historia."],
];

mkdirSync(OUT, { recursive: true });
const ok = [];
const fail = [];
const metaCache = new Map();

async function resolveFile(id, hint) {
  if (hint?.startsWith("@")) return hint.slice(1);
  if (!metaCache.has(id)) {
    metaCache.set(id, await fetch(`${META}/${id}`).then((x) => x.json()).catch(() => null));
  }
  const files = metaCache.get(id)?.files || [];
  const pdfs = files.filter(
    (f) => /\.pdf$/i.test(f.name) && !f.private && !/encrypted|sample|bw_/i.test(f.name) && (f.size || 0) <= MAX
  );
  // Prefiere _text.pdf (capa OCR) si hay dos del mismo tamaño
  const best = pdfs.sort((a, b) =>
    (/text\.pdf$/i.test(b.name) ? 1 : 0) - (/text\.pdf$/i.test(a.name) ? 1 : 0) || (b.size || 0) - (a.size || 0)
  )[0];
  return best?.name || null;
}

for (const [id, hint, local, cat, title, author, year, note] of ITEMS) {
  const dest = join(OUT, local);
  if (existsSync(dest) && statSync(dest).size > 50_000) {
    ok.push([local, cat, title, author, year, (statSync(dest).size / 1e6).toFixed(1), note]);
    console.log("ok (existe)", local);
    continue;
  }
  try {
    const file = await resolveFile(id, hint);
    if (!file) throw new Error("sin PDF ≤95MB");
    const url = `${IA}/${id}/${file.split("/").map(encodeURIComponent).join("/")}`;
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    const mb = statSync(dest).size / 1e6;
    if (mb < 0.05) throw new Error("muy pequeño");
    ok.push([local, cat, title, author, year, mb.toFixed(1), note]);
    console.log("ok", local, `(${mb.toFixed(1)} MB)`);
  } catch (e) {
    fail.push(local);
    console.log("FALLO", local, "—", e.message);
  }
}

const entries = ok.map(([local, cat, title, author, year, mb, note]) => ({
  id: local.replace(/\.pdf$/, ""),
  type: "pdf", source: "local", lang: "es",
  title, author, year: Number(year) || undefined,
  category: cat, size: `${mb} MB`,
  file: `/libros/espanol/${local}`,
  note, tags: [cat],
}));
writeFileSync(
  "src/data/spanishBooks.gen.js",
  `// Generado por scripts/fetch-espanol2.mjs — ${ok.length} libros en español\nexport const SPANISH_EXTRA = ${JSON.stringify(entries, null, 2)};\n`
);
console.log(`\nDescargados: ${ok.length} | Fallidos: ${fail.length}${fail.length ? " -> " + fail.join(", ") : ""}`);
console.log("Módulo: src/data/spanishBooks.gen.js");
