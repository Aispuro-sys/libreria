import React from "react";
import { X, ExternalLink, ShieldAlert } from "lucide-react";

/**
 * Confirmación antes de salir de la app hacia un enlace externo.
 * Muestra el dominio de destino y deja quedarse o continuar.
 */
export default function ExitConfirm({ item, onConfirm, onCancel }) {
  if (!item) return null;
  let host = "";
  try {
    host = new URL(item.url).hostname.replace(/^www\./, "");
  } catch {
    host = item.url;
  }

  return (
    <div className="fixed inset-0 z-[85] bg-ink/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fadeIn" onClick={onCancel}>
      <div
        className="w-full sm:max-w-sm bg-paper border border-steel-200 shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-5">
          <span className="w-10 h-10 metal-dark text-white flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </span>
          <button onClick={onCancel} className="p-1.5 -mr-1.5 text-steel-500 hover:text-mist">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4">
          <h3 className="display text-2xl metal-text">¿Salir de Biblioteca?</h3>
          <p className="mt-3 text-xs leading-relaxed text-steel-500">
            Vas a abrir <span className="text-mist font-semibold">«{item.title}»</span> en un sitio externo:
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-mist bg-steel-50 border border-steel-200 px-3 py-2 truncate">
            {host}
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-steel-400">
            Se abrirá en el navegador, fuera de la app. Tu progreso y notas quedan guardados aquí.
          </p>
        </div>
        <div className="flex gap-2 px-5 pb-5 safe-bottom">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] border border-steel-300 text-steel-500 hover:text-mist hover:border-steel-500 transition-colors"
          >
            Quedarse
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] metal text-ink hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
          >
            Salir <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
