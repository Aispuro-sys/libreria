import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Headphones,
  Play, Pause, Square, Gauge, Loader2, BookOpen, Heart, StickyNote, List,
  Scroll as ScrollIcon, FileText, TableOfContents,
} from "lucide-react";
import { getDocument, renderPage, pageSentences } from "../lib/pdf";
import { pickVoice, utteranceLang, unlockTTS } from "../lib/tts";
import { NoteList, NoteForm } from "./NotesModal";

const RATES = [0.8, 1, 1.25, 1.5, 2];
const KEEP_RADIUS = 8; // páginas renderizadas que se conservan alrededor de la actual

/**
 * Pila vertical de páginas, UNA por scroll (snap obligatorio):
 * cada slot ocupa toda la altura del viewport y el canvas se ajusta
 * dentro. Renderizado virtualizado (IntersectionObserver) y liberación
 * de canvas lejanos para no inflar memoria.
 */
function ScrollPages({ doc, total, scale, containerRef, onVisiblePage, registerJump, startAt = 1 }) {
  const [box, setBox] = useState(null); // { w, h } del viewport del lector
  const slotsRef = useRef(new Map());   // n -> elemento slot
  const renderedRef = useRef(new Set());// páginas con canvas renderizado
  const pendingRef = useRef(new Set());
  const epochRef = useRef(0);           // invalida renders al cambiar zoom/doc
  const currentRef = useRef(1);

  // Medir el viewport del lector (ResizeObserver captura cambios de la UI)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setBox({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [containerRef]);

  const renderSlot = useCallback(
    (n) => {
      const epoch = epochRef.current;
      if (renderedRef.current.has(n) || pendingRef.current.has(n)) return;
      const el = slotsRef.current.get(n);
      const canvas = el?.querySelector("canvas");
      if (!canvas || !box) return;
      pendingRef.current.add(n);
      const maxWidth = Math.max(280, Math.min(box.w - 24, 860) * scale);
      const maxHeight = Math.max(320, (box.h - 24) * scale);
      renderPage(doc, n, canvas, { maxWidth, maxHeight })
        .then(() => {
          if (epoch !== epochRef.current) return;
          renderedRef.current.add(n);
        })
        .catch(() => {})
        .finally(() => pendingRef.current.delete(n));
    },
    [doc, scale, box]
  );

  const clearSlot = useCallback((n) => {
    const canvas = slotsRef.current.get(n)?.querySelector("canvas");
    if (canvas) { canvas.width = 0; canvas.height = 0; canvas.removeAttribute("style"); }
    renderedRef.current.delete(n);
  }, []);

  // Observador: renderiza lo cercano, libera lo lejano
  useEffect(() => {
    if (!containerRef.current || !box) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          const n = Number(en.target.dataset.n);
          if (en.isIntersecting) renderSlot(n);
          else if (Math.abs(n - currentRef.current) > KEEP_RADIUS) clearSlot(n);
        }
      },
      { root: containerRef.current, rootMargin: "120% 0px" }
    );
    slotsRef.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [containerRef, box, total, scale, renderSlot, clearSlot]);

  // Zoom/doc: invalida lo renderizado
  useEffect(() => {
    epochRef.current++;
    renderedRef.current.forEach((n) => clearSlot(n));
    renderedRef.current.clear();
  }, [scale, doc, clearSlot]);

  // Página visible actual según posición del scroll
  useEffect(() => {
    const sc = containerRef.current;
    if (!sc) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const mid = sc.scrollTop + sc.clientHeight * 0.35;
        let found = 1;
        for (const [n, el] of slotsRef.current) {
          if (el.offsetTop <= mid) found = n;
          else break;
        }
        if (found !== currentRef.current) {
          currentRef.current = found;
          onVisiblePage(found);
        }
      });
    };
    sc.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { sc.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [containerRef, total, onVisiblePage]);

  // Saltar a una página (registrado por el padre)
  useEffect(() => {
    registerJump((n) => {
      const el = slotsRef.current.get(n);
      el?.scrollIntoView({ block: "start", behavior: "auto" });
      currentRef.current = n;
      onVisiblePage(n);
    });
  }, [registerJump, onVisiblePage]);

  // Posición inicial (continuar donde quedó la lectura)
  const jumpedRef = useRef(false);
  useEffect(() => {
    if (!box || jumpedRef.current || startAt <= 1) return;
    jumpedRef.current = true;
    const t = setTimeout(() => {
      const el = slotsRef.current.get(startAt);
      el?.scrollIntoView({ block: "start", behavior: "auto" });
      currentRef.current = startAt;
      onVisiblePage(startAt);
    }, 60);
    return () => clearTimeout(t);
  }, [box, startAt, onVisiblePage]);

  if (!box) return null;

  return (
    <div className="flex flex-col w-full">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          data-n={n}
          ref={(el) => (el ? slotsRef.current.set(n, el) : slotsRef.current.delete(n))}
          className="relative w-full snap-start snap-always flex items-center justify-center shrink-0"
          style={{ height: box.h }}
        >
          <canvas className="block bg-white shadow-2xl shadow-black/60" />
          <span className="absolute bottom-2 right-3 font-mono text-[10px] text-steel-400 bg-paper/70 px-1.5 py-0.5 pointer-events-none">
            {n}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Reader({
  book, initialPage = 1, startListening = false,
  fav, onToggleFav, notes = {}, onAddNote, onDeleteNote,
  onProgress, onClose,
}) {
  const [doc, setDoc] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [scale, setScale] = useState(1);
  const [viewMode, setViewMode] = useState("scroll"); // "scroll" | "page"
  const [rendering, setRendering] = useState(true);
  const [docError, setDocError] = useState(null);

  // Estado audiolibro
  const [listenMode, setListenMode] = useState(false);
  const [sentences, setSentences] = useState([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rateIdx, setRateIdx] = useState(1);

  // Estado notas / índice
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesScope, setNotesScope] = useState("page"); // "page" | "all"
  const [tocOpen, setTocOpen] = useState(false);
  const [toc, setToc] = useState(null); // null = no cargado, [] = sin índice

  const canvasRef = useRef(null);
  const scrollRef = useRef(null);
  const listRef = useRef(null);
  const touchRef = useRef(null);
  const jumpRef = useRef(() => {});
  // Refs mutables para el motor TTS (evita closures obsoletos en onend)
  const tts = useRef({ sentences: [], idx: 0, playing: false, mode: false, page: 1, rate: 1 });

  /* ---------- Carga del documento ---------- */
  useEffect(() => {
    let alive = true;
    setDocError(null);
    getDocument(book)
      .then((d) => {
        if (!alive) return;
        setDoc(d);
        setTotal(d.numPages);
        const p = Math.min(Math.max(1, initialPage), d.numPages);
        setPage(p);
        tts.current.page = p;
        if (startListening) setListenMode(true);
      })
      .catch((e) => alive && setDocError(e?.message || "No se pudo abrir el PDF"));
    return () => { alive = false; };
  }, [book]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Render de página (modo paginado) ---------- */
  useEffect(() => {
    if (!doc || !canvasRef.current || viewMode !== "page") return;
    let alive = true;
    setRendering(true);
    const container = scrollRef.current;
    const maxWidth = container ? Math.min(container.clientWidth - 32, 860) * scale : 720 * scale;
    renderPage(doc, page, canvasRef.current, { maxWidth: Math.max(280, maxWidth) })
      .catch(() => {})
      .finally(() => alive && setRendering(false));
    return () => { alive = false; };
  }, [doc, page, scale, viewMode]);

  /* ---------- Progreso ---------- */
  useEffect(() => {
    if (total) onProgress?.(book.id, { page, total });
    tts.current.page = page;
    if (viewMode === "page" && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [page, total, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Motor TTS ---------- */
  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    tts.current.playing = false;
    setPlaying(false);
  }, []);

  const goTo = useCallback(
    (p) => {
      const clamped = Math.min(Math.max(1, p), total || 1);
      if (viewMode === "scroll") {
        jumpRef.current(clamped);
        setPage(clamped);
      } else if (clamped !== page) {
        setPage(clamped);
      }
    },
    [page, total, viewMode]
  );

  const speak = useCallback(
    (i) => {
      const t = tts.current;
      const s = t.sentences[i];
      if (!s || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(s);
      const voice = pickVoice(book.lang);
      u.lang = voice?.lang || utteranceLang(book.lang);
      if (voice) u.voice = voice;
      u.rate = t.rate;
      u.onend = () => {
        if (!t.playing) return;
        const next = i + 1;
        if (next < t.sentences.length) {
          t.idx = next;
          setIdx(next);
          speak(next);
        } else {
          // Fin de página: avanzar automáticamente si sigue el modo escucha
          const nextPage = t.page + 1;
          if (t.mode && nextPage <= (doc?.numPages || 0)) {
            goToRef.current(nextPage);
          } else {
            stopSpeech();
          }
        }
      };
      u.onerror = () => { if (t.playing) stopSpeech(); };
      t.idx = i;
      setIdx(i);
      // iOS falla si speak() va pegado a cancel(); pequeño respiro
      setTimeout(() => {
        if (t.playing) window.speechSynthesis.speak(u);
      }, 60);
    },
    [doc, stopSpeech, book]
  );

  // goTo accesible desde el closure de speak
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  // Cargar frases al entrar en modo escucha o cambiar de página
  useEffect(() => {
    const entering = listenMode && !tts.current.mode;
    tts.current.mode = listenMode;
    if (!listenMode || !doc) return;
    let alive = true;
    const wasPlaying = tts.current.playing;
    tts.current.playing = false;
    window.speechSynthesis?.cancel();
    pageSentences(doc, page).then((s) => {
      if (!alive || !tts.current.mode) return;
      tts.current.sentences = s;
      tts.current.idx = 0;
      setSentences(s);
      setIdx(0);
      // Narra al entrar al modo o si ya venía sonando; respeta la pausa
      if (entering || wasPlaying) {
        tts.current.playing = true;
        setPlaying(true);
        speak(0);
      }
    });
    return () => { alive = false; };
  }, [listenMode, doc, page, speak]);

  // Limpieza al desmontar
  useEffect(() => () => stopSpeech(), [stopSpeech]);

  // Voces cargadas asíncronamente en iOS
  useEffect(() => {
    window.speechSynthesis?.getVoices();
  }, []);

  // Nombre de la voz activa (para mostrarla en el panel de audiolibro)
  const [voiceName, setVoiceName] = useState(null);
  useEffect(() => {
    if (!listenMode) return;
    const pick = () => setVoiceName(pickVoice(book.lang)?.name || null);
    pick();
    const t = setTimeout(pick, 500); // iOS resuelve las voces de forma asíncrona
    return () => clearTimeout(t);
  }, [listenMode, book.lang]);

  // Auto-scroll a la frase actual
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-i="${idx}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [idx]);

  /* ---------- Índice (outline del PDF) ---------- */
  const openToc = useCallback(async () => {
    setNotesOpen(false);
    setTocOpen(true);
    if (toc || !doc) return;
    try {
      const outline = await doc.getOutline();
      const flat = [];
      const walk = (items, depth) =>
        items?.forEach((it) => {
          if (it.title?.trim()) flat.push({ title: it.title.trim(), dest: it.dest, depth });
          walk(it.items, depth + 1);
        });
      walk(outline, 0);
      setToc(flat);
    } catch {
      setToc([]);
    }
  }, [doc, toc]);

  const goToDest = useCallback(
    async (dest) => {
      try {
        const ref = typeof dest === "string" ? await doc.getDestination(dest) : dest;
        if (!ref) return;
        const pageIndex = await doc.getPageIndex(ref[0]);
        goToRef.current(pageIndex + 1);
        setTocOpen(false);
      } catch {}
    },
    [doc]
  );

  /* ---------- Navegación ---------- */
  const onVisiblePage = useCallback((n) => setPage(n), []);

  const toggleListen = () => {
    if (listenMode) {
      stopSpeech();
      setListenMode(false);
      setSentences([]);
    } else {
      unlockTTS(); // desbloqueo dentro del gesto (iOS)
      setListenMode(true);
    }
  };

  const togglePlay = () => {
    if (playing) {
      // Pausa segura en iOS: cancelar y recordar índice
      stopSpeech();
    } else {
      tts.current.playing = true;
      setPlaying(true);
      speak(tts.current.idx);
    }
  };

  const cycleRate = () => {
    const next = (rateIdx + 1) % RATES.length;
    setRateIdx(next);
    tts.current.rate = RATES[next];
    if (playing) speak(tts.current.idx); // re-aplica velocidad en la frase actual
  };

  // Gestos táctiles: swipe izquierda/derecha (solo modo paginado)
  const onTouchStart = (e) => { if (viewMode === "page") touchRef.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchRef.current == null) return;
    const dx = e.changedTouches[0].clientX - touchRef.current;
    touchRef.current = null;
    if (Math.abs(dx) > 60) goTo(page + (dx < 0 ? 1 : -1));
  };

  const pct = total ? Math.round((page / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 metal-dark grid-bg-dark text-white flex flex-col animate-fadeIn">
      {/* Barra superior */}
      <div className="safe-top border-b border-steel-200 bg-paper/70 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={onClose} className="p-2 -ml-2 text-steel-400 hover:text-mist" title="Cerrar">
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold truncate">{book.title}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-steel-500 truncate">
              {book.author}
            </div>
          </div>
          <span className="font-mono text-[11px] text-steel-400 shrink-0">
            {total ? `${page} / ${total}` : "…"}
          </span>
          <button
            onClick={() => (tocOpen ? setTocOpen(false) : openToc())}
            title="Índice del libro"
            className={`p-2 shrink-0 ${tocOpen ? "text-ink bg-mist" : "text-steel-400 hover:text-mist"}`}
          >
            <TableOfContents className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setTocOpen(false); setNotesOpen((o) => !o); }}
            title="Notas de página"
            className={`p-2 shrink-0 relative ${notesOpen ? "text-ink bg-mist" : "text-steel-400 hover:text-mist"}`}
          >
            <StickyNote className="w-5 h-5" />
            {(notes[String(page)]?.length || 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-mist text-ink font-mono text-[9px] flex items-center justify-center">
                {notes[String(page)].length}
              </span>
            )}
          </button>
          <button
            onClick={() => onToggleFav?.(book.id)}
            title={fav ? "Quitar de favoritos" : "Añadir a favoritos"}
            className={`p-2 shrink-0 ${fav ? "text-ink bg-mist" : "text-steel-400 hover:text-mist"}`}
          >
            <Heart className={`w-5 h-5 ${fav ? "fill-ink" : ""}`} />
          </button>
        </div>
        <div className="progress-track bg-steel-200">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Área de lectura */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-auto ${
          viewMode === "scroll" ? "snap-y snap-mandatory" : "flex items-start justify-center py-4 px-4"
        }`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {docError ? (
          <div className="self-center text-center px-6">
            <BookOpen className="w-8 h-8 text-steel-500 mx-auto" />
            <p className="mt-3 text-sm text-steel-500">{docError}</p>
          </div>
        ) : viewMode === "scroll" ? (
          doc && total > 0 ? (
            <ScrollPages
              doc={doc}
              total={total}
              scale={scale}
              containerRef={scrollRef}
              onVisiblePage={onVisiblePage}
              registerJump={(fn) => { jumpRef.current = fn; }}
              startAt={page}
            />
          ) : (
            <div className="self-center"><Loader2 className="w-6 h-6 animate-spin text-steel-400" /></div>
          )
        ) : (
          <div className="relative my-auto">
            {rendering && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/40">
                <Loader2 className="w-6 h-6 animate-spin text-steel-400" />
              </div>
            )}
            <canvas ref={canvasRef} className="shadow-2xl shadow-black/60 bg-white max-w-none" />
          </div>
        )}
      </div>

      {/* Panel audiolibro */}
      {listenMode && (
        <div className="border-t border-steel-200 bg-paper/85 backdrop-blur-sm animate-slideUp">
          <div ref={listRef} className="max-h-36 overflow-y-auto px-4 py-3 text-[13px] leading-relaxed">
            {sentences.length === 0 ? (
              <p className="text-steel-400 font-mono text-[11px] uppercase tracking-widest py-2 text-center">
                Extrayendo texto de la página…
              </p>
            ) : (
              <>
                <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-steel-400 truncate">
                  Voz · {voiceName || utteranceLang(book.lang)}
                </p>
                <p>
                  {sentences.map((s, i) => (
                    <span key={i} data-i={i} className={i === idx && playing ? "tts-current" : i === idx ? "text-mist" : "text-steel-500"}>
                      {s}{" "}
                    </span>
                  ))}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 px-4 pb-3 safe-bottom">
            <button onClick={cycleRate} title="Velocidad" className="p-2.5 border border-steel-300 text-steel-400 hover:text-mist hover:border-steel-500 flex items-center gap-1.5 font-mono text-[11px]">
              <Gauge className="w-4 h-4" /> {RATES[rateIdx]}x
            </button>
            <button onClick={togglePlay} className="w-12 h-12 metal text-ink flex items-center justify-center" title={playing ? "Pausar" : "Reproducir"}>
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button onClick={toggleListen} title="Detener audiolibro" className="p-2.5 border border-steel-300 text-steel-400 hover:text-mist hover:border-steel-500">
              <Square className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Barra inferior de navegación */}
      <div className="safe-bottom border-t border-steel-200 bg-paper/70 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-1 px-2 py-2">
          <div className="flex items-center">
            <button onClick={() => goTo(page - 1)} disabled={page <= 1} className="p-2.5 text-steel-400 hover:text-mist disabled:opacity-30" title="Anterior">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => goTo(page + 1)} disabled={page >= total} className="p-2.5 text-steel-400 hover:text-mist disabled:opacity-30" title="Siguiente">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <input
            type="range"
            min={1}
            max={Math.max(total, 1)}
            value={page}
            onChange={(e) => goTo(Number(e.target.value))}
            className="flex-1 mx-2 accent-white h-1 hidden sm:block"
            aria-label="Ir a página"
          />
          <button
            onClick={() => {
              const v = window.prompt(`Ir a página (1–${total}):`, String(page));
              const n = parseInt(v, 10);
              if (Number.isFinite(n)) goTo(n);
            }}
            title="Ir a página"
            className="font-mono text-[11px] text-steel-500 sm:hidden shrink-0 px-1 py-1 active:text-mist"
          >
            {page}/{total}
          </button>

          <div className="flex items-center">
            <button onClick={() => setScale((s) => Math.max(0.6, +(s - 0.2).toFixed(2)))} className="p-2.5 text-steel-400 hover:text-mist" title="Alejar">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button onClick={() => setScale((s) => Math.min(2.5, +(s + 0.2).toFixed(2)))} className="p-2.5 text-steel-400 hover:text-mist" title="Acercar">
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode((m) => (m === "scroll" ? "page" : "scroll"))}
              title={viewMode === "scroll" ? "Cambiar a modo paginado" : "Cambiar a scroll continuo"}
              className="p-2.5 text-steel-400 hover:text-mist"
            >
              {viewMode === "scroll" ? <FileText className="w-5 h-5" /> : <ScrollIcon className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleListen}
              title={listenMode ? "Volver a lectura" : "Escuchar audiolibro"}
              className={`p-2.5 ml-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                listenMode ? "metal text-ink" : "text-steel-400 hover:text-mist"
              }`}
            >
              <Headphones className="w-5 h-5" />
              <span className="hidden sm:inline">{listenMode ? "Leyendo" : "Escuchar"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Panel de notas */}
      {notesOpen && (
        <div className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:top-0 sm:w-[380px] bg-paper text-mist border-t sm:border-t-0 sm:border-l border-steel-200 shadow-2xl flex flex-col animate-slideUp max-h-[65dvh] sm:max-h-none safe-top z-10">
          <div className="flex items-center justify-between px-4 py-3 border-b border-steel-200">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-mist" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Notas</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setNotesScope("page")}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${notesScope === "page" ? "metal text-ink border-transparent" : "border-steel-300 text-steel-500"}`}
              >
                Pág. {page}
              </button>
              <button
                onClick={() => setNotesScope("all")}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${notesScope === "all" ? "metal text-ink border-transparent" : "border-steel-300 text-steel-500"}`}
              >
                <List className="w-3 h-3" /> Todas
              </button>
              <button onClick={() => setNotesOpen(false)} className="p-1.5 text-steel-500 hover:text-mist">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {notesScope === "page" ? (
              <NoteList
                notes={notes[String(page)]}
                onDelete={(id) => onDeleteNote(book.id, String(page), id)}
                compact
              />
            ) : (
              (() => {
                const pages = Object.keys(notes)
                  .filter((k) => notes[k]?.length)
                  .sort((a, b) => Number(a) - Number(b));
                if (!pages.length)
                  return <p className="font-mono text-[11px] uppercase tracking-widest text-steel-500 py-4 text-center">Sin notas en este libro</p>;
                return pages.map((p) => (
                  <div key={p} className="mb-4">
                    <button
                      onClick={() => { goTo(Number(p)); setNotesScope("page"); }}
                      className="eyebrow text-steel-500 hover:text-mist mb-2 underline underline-offset-4"
                    >
                      Página {p}
                    </button>
                    <NoteList notes={notes[p]} onDelete={(id) => onDeleteNote(book.id, p, id)} compact />
                  </div>
                ));
              })()
            )}
          </div>

          <div className="px-4 py-3 border-t border-steel-200 safe-bottom">
            <p className="font-mono text-[10px] uppercase tracking-widest text-steel-400 mb-2">
              Nota en página {page} — se guarda al instante
            </p>
            <NoteForm onAdd={(text) => onAddNote(book.id, String(page), text)} dark />
          </div>
        </div>
      )}

      {/* Panel del índice */}
      {tocOpen && (
        <div className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:right-auto sm:left-0 sm:top-0 sm:w-[380px] bg-paper text-mist border-t sm:border-t-0 sm:border-r border-steel-200 shadow-2xl flex flex-col animate-slideUp max-h-[65dvh] sm:max-h-none safe-top z-10">
          <div className="flex items-center justify-between px-4 py-3 border-b border-steel-200">
            <div className="flex items-center gap-2">
              <TableOfContents className="w-4 h-4 text-mist" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Índice</span>
            </div>
            <button onClick={() => setTocOpen(false)} className="p-1.5 text-steel-500 hover:text-mist">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 safe-bottom">
            {toc === null ? (
              <p className="font-mono text-[11px] uppercase tracking-widest text-steel-500 py-4 text-center">
                Cargando índice…
              </p>
            ) : toc.length === 0 ? (
              <p className="font-mono text-[11px] uppercase tracking-widest text-steel-500 py-4 text-center">
                Este libro no tiene índice
              </p>
            ) : (
              toc.map((it, i) => (
                <button
                  key={i}
                  onClick={() => goToDest(it.dest)}
                  className="w-full text-left px-3 py-2.5 text-[13px] text-steel-600 hover:text-mist hover:bg-steel-100 transition-colors leading-snug"
                  style={{ paddingLeft: `${12 + it.depth * 16}px` }}
                >
                  {it.title}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
