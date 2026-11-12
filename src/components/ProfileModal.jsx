import React, { useState } from "react";
import { X, UserPlus, Check, Trash2, BookOpen, ShieldCheck } from "lucide-react";
import { PALETTE } from "../lib/store";
import LegalModal from "./LegalModal";

export function Avatar({ user, size = "md" }) {
  const dim = size === "sm" ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-xs";
  return (
    <span
      className={`${dim} inline-flex items-center justify-center font-bold text-white shrink-0 border border-steel-300`}
      style={{ background: user.color }}
    >
      {user.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * Modal de perfiles: cambiar de usuario, crear o eliminar.
 * gate=true → sin botón cerrar (primer arranque, obligatorio elegir/crear).
 */
export default function ProfileModal({ users, currentId, gate = false, onSelect, onCreate, onDelete, onClose }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [consent, setConsent] = useState(false);
  const [legal, setLegal] = useState(null); // "privacidad" | "terminos" | null

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !consent) return;
    onCreate(name, color);
    setName("");
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-ink/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fadeIn">
        <div className="w-full sm:max-w-md bg-paper border border-steel-200 shadow-2xl animate-slideUp max-h-[92dvh] overflow-y-auto">
          <div className="metal-dark grid-bg-dark px-6 py-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="eyebrow text-steel-400">Perfiles</div>
                <h2 className="display text-3xl metal-text mt-2">¿Quién lee?</h2>
                <p className="text-xs text-steel-400 mt-2 leading-relaxed">
                  Cada perfil guarda su propio progreso, favoritos y notas — todo en este dispositivo.
                </p>
              </div>
              {!gate && (
                <button onClick={onClose} className="p-2 -mr-2 -mt-1 text-steel-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* Lista de usuarios */}
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 p-3 border transition-colors cursor-pointer ${
                    u.id === currentId ? "border-steel-400 bg-steel-100" : "border-steel-200 bg-steel-50 hover:border-steel-400"
                  }`}
                  onClick={() => onSelect(u.id)}
                >
                  <Avatar user={u} />
                  <span className="flex-1 text-sm font-semibold text-mist">{u.name}</span>
                  {u.id === currentId && <Check className="w-4 h-4 text-mist" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(u.id); }}
                    className="p-1.5 text-steel-400 hover:text-mist"
                    title="Eliminar perfil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {users.length === 0 && (
                <div className="text-center py-6 text-steel-400">
                  <BookOpen className="w-8 h-8 mx-auto" />
                  <p className="mt-2 text-xs font-mono uppercase tracking-widest">Sin perfiles todavía</p>
                </div>
              )}
            </div>

            {/* Crear perfil */}
            <form onSubmit={submit} className="mt-6 pt-6 border-t border-steel-200">
              <label className="eyebrow text-steel-500 block">Nuevo perfil</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre…"
                maxLength={24}
                className="mt-2 w-full px-3 py-2.5 bg-steel-50 border border-steel-200 text-sm text-mist placeholder:text-steel-400 focus:outline-none focus:border-steel-400"
              />
              <div className="mt-3 flex items-center gap-2">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 border-2 transition-transform ${color === c ? "border-mist scale-110" : "border-steel-300"}`}
                    style={{ background: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>

              {/* Consentimiento legal */}
              <label className="mt-4 flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-white shrink-0"
                />
                <span className="text-[11px] leading-relaxed text-steel-500">
                  He leído y acepto el{" "}
                  <button type="button" onClick={() => setLegal("privacidad")} className="text-mist underline underline-offset-2 inline-flex items-center gap-0.5">
                    aviso de privacidad
                  </button>{" "}
                  y los{" "}
                  <button type="button" onClick={() => setLegal("terminos")} className="text-mist underline underline-offset-2">
                    términos de uso
                  </button>
                  . Mis datos se guardan solo en este dispositivo.
                </span>
              </label>

              <button
                type="submit"
                disabled={!name.trim() || !consent}
                className="mt-4 w-full py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] metal text-ink hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" /> Crear y entrar
              </button>

              <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-steel-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Sin cuentas, sin servidores, sin rastreo
              </p>
            </form>
          </div>
        </div>
      </div>

      {legal && <LegalModal initialTab={legal} onClose={() => setLegal(null)} />}
    </>
  );
}
