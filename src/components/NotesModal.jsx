import React, { useState } from "react";
import { X, StickyNote, Trash2 } from "lucide-react";

function fmt(ts) {
  try {
    return new Date(ts).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Lista de notas con alta/borrado. Reutilizado por el modal de recursos
 * externos (pageKey "general") y por el panel del lector (pageKey = página).
 */
export function NoteList({ notes, onDelete, compact = false }) {
  if (!notes?.length) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-widest text-steel-500 py-4 text-center">
        Sin notas todavía
      </p>
    );
  }
  return (
    <ul className={compact ? "space-y-2" : "space-y-3"}>
      {notes.map((n) => (
        <li key={n.id} className="group flex items-start gap-3 bg-steel-50 border border-steel-200 p-3 text-left">
          <StickyNote className="w-4 h-4 text-steel-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-mist whitespace-pre-wrap break-words">{n.text}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-steel-400">{fmt(n.ts)}</p>
          </div>
          <button onClick={() => onDelete(n.id)} className="p-1 text-steel-400 hover:text-mist" title="Borrar nota">
            <Trash2 className="w-4 h-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Formulario para añadir nota. */
export function NoteForm({ onAdd, dark = false }) {
  const [text, setText] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e); }}
        rows={2}
        placeholder="Escribe una nota…"
        className={`flex-1 px-3 py-2 text-sm border resize-none focus:outline-none ${
          dark
            ? "bg-steel-100 border-steel-300 text-mist placeholder:text-steel-400 focus:border-steel-400"
            : "bg-steel-50 border-steel-300 text-mist placeholder:text-steel-400 focus:border-steel-400"
        }`}
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className={`self-end px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors disabled:opacity-40 ${
          dark ? "bg-white text-ink hover:bg-steel-200" : "metal text-ink hover:opacity-90"
        }`}
      >
        Añadir
      </button>
    </form>
  );
}

/** Modal de notas para recursos externos (sin páginas). */
export default function NotesModal({ item, notes, onAdd, onDelete, onClose }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-ink/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fadeIn" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-paper border border-steel-300 shadow-2xl animate-slideUp max-h-[85dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-steel-300">
          <div className="min-w-0">
            <div className="eyebrow text-steel-500">Notas · {item.category}</div>
            <h3 className="font-bold text-mist text-sm mt-1 truncate">{item.title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 -mr-1.5 text-steel-500 hover:text-mist">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <NoteList notes={notes} onDelete={onDelete} />
        </div>
        <div className="px-5 py-4 border-t border-steel-300 safe-bottom">
          <NoteForm onAdd={onAdd} />
        </div>
      </div>
    </div>
  );
}
