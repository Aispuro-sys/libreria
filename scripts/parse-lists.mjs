// Convierte las listas "awesome" clonadas en un catálogo JSON unificado
// para la app: src/data/externalBooks.json
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "_lists_src";
const slug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const ITEM_RE = /^[*-]\s+\[([^\]]+)\]\(([^#][^)]*)\)\s*(?:[-–—]\s*(.*))?$/;
const HEAD_RE = /^(#{2,5})\s+(.+?)\s*$/;

const SKIP_HEADS = new Set([
  "contents", "table of contents", "contributing", "license", "licenses",
  "credits", "introduction", "awesome lists", "community and further reading",
]);

/** Parsea un README estilo awesome: entradas "- [t](url) - nota" bajo encabezados. */
function parseMd(file, { source, sectionFilter = null }) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const items = [];
  let h2 = "", h3 = "", h4 = "", skip = false;
  for (const line of lines) {
    const h = line.match(HEAD_RE);
    if (h) {
      const level = h[1].length, name = h[2].replace(/[#*`]/g, "").trim();
      if (level === 2) {
        h2 = name; h3 = ""; h4 = "";
        skip = SKIP_HEADS.has(name.toLowerCase()) ||
          (sectionFilter && !sectionFilter.some((s) => name.toLowerCase().includes(s)));
      } else if (level === 3) { h3 = name; h4 = ""; }
      else if (level >= 4) { h4 = name; }
      continue;
    }
    if (skip) continue;
    const m = line.trim().match(ITEM_RE);
    if (!m) continue;
    const [, title, url, note] = m;
    items.push({
      source,
      type: "link",
      title: title.trim(),
      url: url.trim(),
      note: (note || "").replace(/[*_`]/g, "").trim().slice(0, 220),
      category: (h4 || h3 || h2 || "General").trim(),
      lang: "en",
    });
  }
  return items;
}

/* ---------- Fuentes ---------- */
const out = [];

// 1) Mind-Expanding Books (JSON estructurado, con portadas y rating)
const LANG_MAP = { eng: "en", "en-gb": "en", "en-us": "en", "en-ca": "en", spa: "es", fre: "fr", es: "es", en: "en", fr: "fr" };
const mind = JSON.parse(readFileSync(`${SRC}/Mind-Expanding-Books/app/src/data/books.json`, "utf8"));
for (const b of mind) {
  if (!b.title || !b.url) continue;
  out.push({
    source: "mind",
    type: "link",
    title: b.title,
    author: b.author || "",
    note: (b.description || "").replace(/\s+/g, " ").trim().slice(0, 260),
    category: b.category || "General",
    url: b.url,
    cover: b.image_url || null,
    rating: b.rating ? parseFloat(b.rating) : null,
    year: b.year || null,
    lang: LANG_MAP[(b.lang || "eng").toLowerCase()] || "en",
  });
}

// 2) Awesome Math
out.push(...parseMd(`${SRC}/awesome-math/README.md`, { source: "math" }));

// 3) Awesome Computer Vision (solo secciones de lectura/recursos)
out.push(
  ...parseMd(`${SRC}/awesome-computer-vision/README.md`, {
    source: "cv",
    sectionFilter: ["books", "courses", "tutorials", "blogs"],
  })
);

// 4) GitHub stars (dos listas de repos favoritos)
out.push(...parseMd(`${SRC}/awesome-stars/README.md`, { source: "stars" }));
out.push(...parseMd(`${SRC}/starred/README.md`, { source: "starred" }));

/* ---------- IDs únicos ---------- */
const seen = new Map();
for (const it of out) {
  let base = `${it.source}-${slug(it.title) || "item"}`;
  let id = base, i = 2;
  while (seen.has(id)) id = `${base}-${i++}`;
  seen.set(id, 1);
  it.id = id;
}

const perSource = out.reduce((a, b) => ((a[b.source] = (a[b.source] || 0) + 1), a), {});
console.log("Total:", out.length, perSource);

import { mkdirSync } from "node:fs";
mkdirSync("public/data", { recursive: true });
writeFileSync("public/data/externalBooks.json", JSON.stringify(out));
console.log("→ public/data/externalBooks.json", (JSON.stringify(out).length / 1024).toFixed(0), "KB");
