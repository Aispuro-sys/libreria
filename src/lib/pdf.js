import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const docs = new Map();

/** Devuelve (y cachea) el PDFDocumentProxy de un libro. */
export function getDocument(book) {
  if (!docs.has(book.id)) {
    docs.set(book.id, pdfjs.getDocument({ url: book.file, isEvalSupported: false }).promise);
  }
  return docs.get(book.id);
}

/** Precarga el documento en segundo plano (al pasar el ratón / hacer tap). */
export function preload(book) {
  getDocument(book).catch(() => {});
}

/** Renderiza una página a un canvas. Acepta maxWidth y/o maxHeight (ajusta a ambos). */
export async function renderPage(doc, pageNum, canvas, { scale, maxWidth, maxHeight } = {}) {
  const page = await doc.getPage(pageNum);
  const base = page.getViewport({ scale: 1 });
  let s = scale ?? 1.5;
  if (scale == null) {
    const fits = [];
    if (maxWidth) fits.push(maxWidth / base.width);
    if (maxHeight) fits.push(maxHeight / base.height);
    if (fits.length) s = Math.min(...fits);
  }
  const viewport = page.getViewport({ scale: s });
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const ctx = canvas.getContext("2d", { alpha: false });
  await page.render({
    canvasContext: ctx,
    viewport,
    transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
  }).promise;
  return { width: viewport.width, height: viewport.height };
}

/** Miniatura de la portada como dataURL para las tarjetas del catálogo. */
export async function coverDataUrl(book, width = 480) {
  const doc = await getDocument(book);
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d", { alpha: false });
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { url: canvas.toDataURL("image/jpeg", 0.82), ratio: viewport.height / viewport.width };
}

/** Extrae el texto de una página y lo trocea en frases narrables. */
export async function pageSentences(doc, pageNum) {
  const page = await doc.getPage(pageNum);
  const content = await page.getTextContent();
  const raw = content.items
    .map((it) => it.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/­/g, "")
    .trim();
  if (!raw) return [];
  // Corta tras ., !, ?, :, ;, — o en fragmentos largos
  const parts = raw.match(/[^.!?;:—]+[.!?;:—]?\s*/g) || [raw];
  const sentences = [];
  for (const p of parts) {
    const t = p.trim();
    if (!t) continue;
    if (t.length > 280) {
      // Frase demasiado larga: subdivide por comas o cada ~200 chars
      const sub = t.match(/.{1,200}(?:,|\s|$)/g) || [t];
      sub.forEach((s) => s.trim() && sentences.push(s.trim()));
    } else {
      sentences.push(t);
    }
  }
  return sentences;
}
