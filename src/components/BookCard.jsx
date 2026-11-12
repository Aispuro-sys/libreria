import React, { useEffect, useState } from "react";
import {
  BookOpen, Headphones, Download, Check, Loader2,
  Heart, ExternalLink, StickyNote, Star,
} from "lucide-react";
import { coverDataUrl, preload } from "../lib/pdf";
import { useInView } from "./Reveal";

/** Portada tipográfica de respaldo (estilo metálico de la app). */
function TypoCover({ item }) {
  return (
    <div className="absolute inset-0 metal-dark grid-bg-dark flex flex-col justify-between p-4">
      <span className="eyebrow text-steel-400">{item.category}</span>
      <div>
        <div className="display text-xl leading-tight metal-text line-clamp-4">{item.title}</div>
        {item.author && (
          <div className="mt-2 text-[10px] font-mono uppercase tracking-widest text-steel-400 line-clamp-1">
            {item.author}
          </div>
        )}
      </div>
    </div>
  );
}

function PdfCover({ book }) {
  const [ref, inView] = useInView({ threshold: 0.05, rootMargin: "200px" });
  const [cover, setCover] = useState(null);
  useEffect(() => {
    if (!inView || cover) return;
    let alive = true;
    coverDataUrl(book).then((c) => alive && setCover(c)).catch(() => {});
    return () => { alive = false; };
  }, [inView, book, cover]);
  return (
    <div ref={ref} className="absolute inset-0 bg-steel-100">
      {cover ? (
        <img src={cover.url} alt="" className="w-full h-full object-cover object-top animate-fadeIn" loading="lazy" />
      ) : (
        <TypoCover item={book} />
      )}
    </div>
  );
}

function RemoteCover({ item }) {
  const [err, setErr] = useState(false);
  if (!item.cover || err) return <TypoCover item={item} />;
  return (
    <div className="absolute inset-0 bg-steel-50">
      <img
        src={item.cover}
        alt=""
        loading="lazy"
        onError={() => setErr(true)}
        className="w-full h-full object-cover animate-fadeIn"
      />
    </div>
  );
}

export default function BookCard({
  item, fav, progress, offline, noteCount,
  onRead, onListen, onToggleOffline, onToggleFav, onOpenNotes, onOpenExternal,
}) {
  const [busy, setBusy] = useState(false);
  const isPdf = item.type === "pdf";
  const pct = progress && progress.total ? Math.min(100, Math.round((progress.page / progress.total) * 100)) : 0;

  const handleOffline = async () => {
    setBusy(true);
    try { await onToggleOffline(item); } finally { setBusy(false); }
  };

  const openPrimary = () => {
    if (isPdf) onRead(item);
    else onOpenExternal(item);
  };

  return (
    <article
      className="card flex flex-col overflow-hidden group relative"
      onMouseEnter={() => isPdf && preload(item)}
    >
      {/* Portada */}
      <button onClick={openPrimary} className="text-left relative aspect-[3/4] block" title={item.title}>
        {isPdf ? <PdfCover book={item} /> : <RemoteCover item={item} />}
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        {item.rating && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/75 text-white px-2 py-0.5 font-mono text-[10px]">
            <Star className="w-3 h-3 fill-white" /> {item.rating.toFixed(2)}
          </span>
        )}
      </button>

      {/* Favorito */}
      <button
        onClick={() => onToggleFav(item.id)}
        title={fav ? "Quitar de favoritos" : "Añadir a favoritos"}
        className={`absolute top-2 right-2 p-2 backdrop-blur-sm transition-colors ${
          fav ? "bg-mist text-ink" : "bg-steel-50/80 text-steel-400 hover:text-mist"
        }`}
      >
        <Heart className={`w-4 h-4 ${fav ? "fill-ink" : ""}`} />
      </button>

      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow text-steel-500 truncate">{item.category}</span>
          <span className="font-mono text-[10px] text-steel-400 shrink-0">
            {item.lang?.toUpperCase()}{item.year ? ` · ${item.year}` : ""}{item.size ? ` · ${item.size}` : ""}
          </span>
        </div>

        <h3 className="mt-1.5 font-bold text-mist leading-snug text-sm line-clamp-2">{item.title}</h3>
        {item.author && (
          <p className="mt-0.5 text-[11px] font-mono uppercase tracking-wider text-steel-500 truncate">{item.author}</p>
        )}
        {item.note && <p className="mt-2 text-xs leading-relaxed text-steel-600 line-clamp-2">{item.note}</p>}

        {pct > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-steel-500 mb-1">
              <span>Pág. {progress.page}/{progress.total}</span><span>{pct}%</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        )}

        <div className="mt-auto pt-4 flex items-center gap-2">
          {isPdf ? (
            <>
              <button
                onClick={() => onRead(item)}
                className="flex-1 py-2 text-[11px] font-bold uppercase tracking-[0.15em] metal text-ink hover:opacity-90 transition-colors flex items-center justify-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" /> {pct > 0 ? "Seguir" : "Leer"}
              </button>
              <button
                onClick={() => onListen(item)}
                title="Escuchar como audiolibro"
                className="px-2.5 py-2 border border-steel-300 text-steel-500 hover:border-steel-500 hover:text-mist transition-colors"
              >
                <Headphones className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleOffline}
                disabled={busy}
                title={offline ? "Quitar de offline" : "Descargar para offline"}
                className={`px-2.5 py-2 border transition-colors ${
                  offline ? "metal text-ink border-transparent" : "border-steel-300 text-steel-500 hover:border-steel-500 hover:text-mist"
                }`}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : offline ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              </button>
            </>
          ) : (
            <button
              onClick={openPrimary}
              className="flex-1 py-2 text-[11px] font-bold uppercase tracking-[0.15em] metal text-ink hover:opacity-90 transition-colors flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Abrir
            </button>
          )}
          <button
            onClick={() => onOpenNotes(item)}
            title="Notas"
            className="relative px-2.5 py-2 border border-steel-300 text-steel-500 hover:border-steel-500 hover:text-mist transition-colors"
          >
            <StickyNote className="w-3.5 h-3.5" />
            {noteCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 bg-mist text-ink font-mono text-[9px] flex items-center justify-center">
                {noteCount > 99 ? "99" : noteCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
