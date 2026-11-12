import React, { useState } from "react";
import { Menu, X, Share2, BookOpen, ArrowUpRight } from "lucide-react";
import { Avatar } from "./ProfileModal";

const NAV_LINKS = [
  { label: "Colección", href: "#coleccion" },
  { label: "Audiolibros", href: "#audiolibro" },
  { label: "Instalar", href: "#instalar" },
];

export default function Navbar({ onShare, user, onOpenProfiles }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md border-b border-steel-200 safe-top">
      <div className="wrap">
        <div className="flex items-center justify-between h-16">
          {/* Marca */}
          <a href="#inicio" className="flex items-center gap-3 group">
            <span className="w-9 h-9 metal text-ink flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="hidden sm:block h-6 w-px bg-steel-300"></span>
            <span className="hidden sm:block eyebrow text-steel-500 group-hover:text-mist transition-colors">
              Biblioteca · Libros en Español
            </span>
          </a>

          {/* Links */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-steel-500 hover:text-mist transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <button onClick={onShare} title="Compartir biblioteca" className="p-2 text-steel-500 hover:text-mist transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
            <a
              href="#coleccion"
              className="hidden sm:flex ml-1 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] metal text-ink hover:opacity-90 transition-opacity items-center gap-1.5"
            >
              Leer ahora <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            {user && (
              <button onClick={onOpenProfiles} title={`Perfil: ${user.name}`} className="ml-1 flex items-center gap-2">
                <Avatar user={user} />
              </button>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-mist" aria-label="Menú">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-steel-200 bg-paper px-4 pt-3 pb-5 animate-fadeIn">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-steel-600 hover:text-mist border-b border-steel-200"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-4">
            <a
              href="#coleccion"
              onClick={() => setMobileOpen(false)}
              className="block w-full py-2.5 text-xs font-bold uppercase tracking-widest metal text-ink text-center"
            >
              Leer ahora
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
