import React from "react";
import { BookOpen, Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="metal-dark grid-bg-dark safe-bottom">
      <div className="wrap py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 metal text-ink flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </span>
          <div>
            <div className="display text-xl metal-text leading-none">BIBLIOTECA</div>
            <div className="eyebrow text-steel-500 mt-1">Lee · Escucha · Offline</div>
          </div>
        </div>
        <div className="text-xs text-steel-400 leading-relaxed max-w-md">
          Libros procedentes de la biblioteca pública en español de{" "}
          <a
            href="https://github.com/rosepac/biblioteca-espanol-gratis"
            target="_blank"
            rel="noreferrer"
            className="text-steel-600 underline underline-offset-4 hover:text-mist inline-flex items-center gap-1"
          >
            <Github className="w-3 h-3" /> rosepac
          </a>
          . Contenido con fines educativos.
        </div>
      </div>
    </footer>
  );
}
