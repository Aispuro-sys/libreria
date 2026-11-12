// Descarga PDFs gratuitos curados (de las listas awesome clonadas)
// a public/libros/externos/ para leerlos dentro de la app.
import { mkdirSync, writeFileSync, statSync } from "node:fs";

const TARGETS = [
  { id: "algebraic-topology-hatcher", url: "https://pi.math.cornell.edu/~hatcher/AT/AT.pdf" },
  { id: "applied-linear-algebra-boyd", url: "https://web.stanford.edu/~boyd/vmls/vmls.pdf" },
  { id: "number-theory-shoup", url: "https://shoup.net/ntb/ntb-v2.pdf" },
  { id: "homotopy-type-theory", url: "https://hottheory.files.wordpress.com/2013/03/hott-online-611-ga1a258c.pdf" },
  { id: "real-analysis-trench", url: "https://ramanujan.math.trinity.edu/wtrench/texts/TRENCH_REAL_ANALYSIS.PDF" },
  { id: "elementary-number-theory-stein", url: "https://wstein.org/ent/ent.pdf" },
  { id: "intro-set-theory-weiss", url: "https://www.math.toronto.edu/weiss/set_theory.pdf" },
  { id: "numerical-algorithms-solomon", url: "https://people.csail.mit.edu/jsolomon/share/book/numerical_book.pdf" },
  { id: "forallx-logic", url: "https://www.fecundity.com/codex/forallx.pdf" },
  { id: "graph-theory-diestel", url: "https://www.cs.unibo.it/babaoglu/courses/cas00-01/tutorials/GraphTheory.pdf" },
];

const OUT = "public/libros/externos";
mkdirSync(OUT, { recursive: true });

for (const t of TARGETS) {
  const dest = `${OUT}/${t.id}.pdf`;
  try {
    const res = await fetch(t.url, { redirect: "follow", signal: AbortSignal.timeout(60000) });
    if (!res.ok) { console.log(`✗ ${t.id} HTTP ${res.status}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.subarray(0, 5).toString("latin1").startsWith("%PDF")) {
      console.log(`✗ ${t.id} no es PDF (${(buf.length / 1e6).toFixed(1)} MB)`);
      continue;
    }
    writeFileSync(dest, buf);
    console.log(`✓ ${t.id} ${(statSync(dest).size / 1e6).toFixed(1)} MB`);
  } catch (e) {
    console.log(`✗ ${t.id} ${e.message.slice(0, 80)}`);
  }
}
console.log("Listo.");
