import React, { useMemo, useState } from "react";
import { Search, Heart, ChevronDown, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";
import BookCard from "./BookCard";
import { SOURCES, LANGS } from "../data/books";

const PAGE_SIZE = 36;

/** Ventana de números de página: 1 … c-1 c c+1 … n */
function pageWindow(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

export default function Catalog({
  catalog = [], favs, progressMap, offlineMap, notesMap,
  onRead, onListen, onToggleOffline, onToggleFav, onOpenNotes, onOpenExternal,
}) {
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState("all");
  const [source, setSource] = useState("all");
  const [category, setCategory] = useState("all");
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [onlyReadable, setOnlyReadable] = useState(false);
  const [pageIdx, setPageIdx] = useState(1);

  const categories = useMemo(() => {
    const set = new Set(
      catalog.filter((b) => source === "all" || b.source === source).map((b) => b.category)
    );
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [source, catalog]);

  // Secciones: categorías de los libros legibles en la app, con su conteo
  const sections = useMemo(() => {
    const map = new Map();
    for (const b of catalog) {
      if (b.type !== "pdf") continue;
      map.set(b.category, (map.get(b.category) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((b) => {
      if (source !== "all" && b.source !== source) return false;
      if (lang !== "all" && b.lang !== lang) return false;
      if (category !== "all" && b.category !== category) return false;
      if (onlyFavs && !favs.has(b.id)) return false;
      if (onlyReadable && b.type !== "pdf") return false;
      if (q && ![b.title, b.author, b.note, b.category].filter(Boolean).join(" ").toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [query, lang, source, category, onlyFavs, onlyReadable, favs, catalog]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(pageIdx, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const resetPage = () => setPageIdx(1);
  const goPage = (p) => {
    setPageIdx(Math.min(Math.max(1, p), totalPages));
    document.getElementById("coleccion")?.scrollIntoView({ behavior: "smooth" });
  };

  const noteCounts = useMemo(() => {
    const counts = {};
    for (const [itemId, pages] of Object.entries(notesMap || {})) {
      counts[itemId] = Object.values(pages).reduce((acc, arr) => acc + (arr?.length || 0), 0);
    }
    return counts;
  }, [notesMap]);

  const chip = (active) =>
    `px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] border transition-colors ${
      active ? "metal text-ink border-transparent" : "border-steel-300 text-steel-500 hover:border-steel-500 hover:text-mist"
    }`;

  return (
    <section id="coleccion" className="wrap py-20 sm:py-28">
      <SectionHeader
        index="01"
        eyebrow="Colección"
        title="La Biblioteca"
        description={`${catalog.length} títulos y recursos: tus libros PDF en español (lee o escucha), más catálogos curados de matemáticas, visión por computadora, divulgación y repositorios destacados.`}
      />

      {/* Barra de búsqueda */}
      <Reveal variant="up" className="mb-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); resetPage(); }}
            placeholder="Buscar por título, autor o tema…"
            className="w-full pl-10 pr-4 py-2.5 bg-steel-50 border border-steel-200 text-sm text-mist placeholder:text-steel-400 focus:outline-none focus:border-steel-400 transition-colors"
          />
        </div>
      </Reveal>

      {/* Filtros */}
      <Reveal variant="up" delay={80} className="mb-10 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow text-steel-400 w-16 shrink-0">Fuente</span>
          {SOURCES.map((s) => (
            <button key={s.id} className={chip(source === s.id)} onClick={() => { setSource(s.id); setCategory("all"); resetPage(); }}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow text-steel-400 w-16 shrink-0">Idioma</span>
          {LANGS.map((l) => (
            <button key={l.id} className={chip(lang === l.id)} onClick={() => { setLang(l.id); resetPage(); }}>
              {l.label}
            </button>
          ))}
          <button
            className={`${chip(onlyFavs)} inline-flex items-center gap-1.5`}
            onClick={() => { setOnlyFavs(!onlyFavs); resetPage(); }}
          >
            <Heart className={`w-3 h-3 ${onlyFavs ? "fill-ink" : ""}`} /> Favoritos
          </button>
          <button
            className={`${chip(onlyReadable)} inline-flex items-center gap-1.5`}
            onClick={() => { setOnlyReadable(!onlyReadable); resetPage(); }}
          >
            <BookOpen className="w-3 h-3" /> Legibles aquí
          </button>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); resetPage(); }}
              className="appearance-none pl-3 pr-8 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] border border-steel-300 text-steel-500 bg-steel-50 focus:outline-none focus:border-steel-400 cursor-pointer"
            >
              <option value="all">Categoría: todas</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-steel-400 pointer-events-none" />
          </div>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-steel-500">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          {totalPages > 1 && ` · página ${safePage} de ${totalPages}`}
        </p>
      </Reveal>

      {/* Secciones de libros legibles */}
      <Reveal variant="up" delay={120} className="mb-10">
        <div className="eyebrow text-steel-400 mb-3">Secciones</div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          <button
            className={`${chip(source === "local" && category === "all")} whitespace-nowrap`}
            onClick={() => { setSource("local"); setCategory("all"); resetPage(); }}
          >
            Todas ({sections.reduce((a, [, n]) => a + n, 0)})
          </button>
          {sections.map(([c, n]) => (
            <button
              key={c}
              className={`${chip(source === "local" && category === c)} whitespace-nowrap`}
              onClick={() => { setSource("local"); setCategory(c); resetPage(); }}
            >
              {c} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>
      </Reveal>

      {/* Grid */}
      <Reveal variant="none" stagger={40} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {visible.map((item) => (
          <BookCard
            key={item.id}
            item={item}
            fav={favs.has(item.id)}
            progress={progressMap[item.id]}
            offline={!!offlineMap[item.id]}
            noteCount={noteCounts[item.id] || 0}
            onRead={onRead}
            onListen={onListen}
            onToggleOffline={onToggleOffline}
            onToggleFav={onToggleFav}
            onOpenNotes={onOpenNotes}
            onOpenExternal={onOpenExternal}
          />
        ))}
      </Reveal>

      {filtered.length === 0 && (
        <p className="text-sm text-steel-500 font-mono py-16 text-center">— Sin resultados —</p>
      )}

      {/* Paginación numerada */}
      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-1 font-mono text-xs" aria-label="Paginación">
          <button
            onClick={() => goPage(safePage - 1)}
            disabled={safePage <= 1}
            className="p-2.5 border border-steel-300 text-steel-500 hover:text-mist hover:border-steel-500 disabled:opacity-30 transition-colors"
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {pageWindow(safePage, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-2 text-steel-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => goPage(p)}
                className={`min-w-9 px-2.5 py-2 border transition-colors ${
                  p === safePage
                    ? "metal text-ink border-transparent font-bold"
                    : "border-steel-300 text-steel-500 hover:text-mist hover:border-steel-500"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => goPage(safePage + 1)}
            disabled={safePage >= totalPages}
            className="p-2.5 border border-steel-300 text-steel-500 hover:text-mist hover:border-steel-500 disabled:opacity-30 transition-colors"
            title="Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      )}
    </section>
  );
}
