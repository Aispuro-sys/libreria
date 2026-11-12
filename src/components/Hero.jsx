import React from "react";
import { Headphones, BookOpen, WifiOff, Smartphone } from "lucide-react";
import { CountUp } from "./Reveal";
import { BOOKS } from "../data/books";

const FEATURES = [
  { icon: BookOpen, title: "Lector integrado", text: "PDF renderizado en el navegador, con memoria de página y zoom." },
  { icon: Headphones, title: "Modo audiolibro", text: "Narración en español del texto de cada página, con avance automático." },
  { icon: WifiOff, title: "Offline real", text: "Descarga los libros que quieras y léelos sin conexión." },
  { icon: Smartphone, title: "PWA en iPhone", text: "Instálala en tu pantalla de inicio y úsala como app nativa." },
];

export default function Hero({ catalog = BOOKS }) {
  const totalMb = BOOKS.reduce((acc, b) => acc + parseFloat(b.size), 0);
  const langs = new Set(catalog.map((b) => b.lang)).size;
  const sources = new Set(catalog.map((b) => b.source)).size;

  return (
    <header id="inicio" className="relative overflow-hidden bg-paper grid-bg">
      {/* Texto gigante de fondo */}
      <div className="pointer-events-none select-none absolute -bottom-6 left-0 right-0 overflow-hidden" aria-hidden="true">
        <span className="display outline-text block whitespace-nowrap text-[22vw] leading-none text-center">
          LIBROS
        </span>
      </div>

      <div className="wrap relative pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="hero-in hero-in-1 flex items-center gap-3 eyebrow text-steel-500">
          <span className="w-10 h-px bg-steel-400"></span>
          Fuente · github.com/rosepac/biblioteca-espanol-gratis
        </div>

        <h1 className="hero-in hero-in-2 display mt-6 text-[16vw] sm:text-7xl md:text-8xl lg:text-9xl metal-text">
          BIBLIOTECA
        </h1>

        <p className="hero-in hero-in-3 mt-6 max-w-xl text-sm sm:text-base text-steel-600 leading-relaxed">
          Tu colección personal: libros PDF en español listos para leer o escuchar
          como audiolibro, más miles de títulos y recursos curados. Perfiles con
          progreso, favoritos y notas por página — instalable en tu iPhone.
        </p>

        {/* Métricas */}
        <div className="hero-in hero-in-4 mt-10 flex flex-wrap gap-x-10 gap-y-4">
          {[
            { v: `${catalog.length}`, l: "Recursos" },
            { v: `${BOOKS.length}`, l: "Libros PDF" },
            { v: `${totalMb.toFixed(0)} MB`, l: "De lectura" },
            { v: `${langs}`, l: "Idiomas" },
            { v: `${sources}`, l: "Fuentes" },
          ].map((m) => (
            <div key={m.l}>
              <div className="display text-3xl sm:text-4xl text-mist">
                <CountUp value={m.v} />
              </div>
              <div className="eyebrow text-steel-500 mt-1">{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tira de características */}
      <div className="metal-dark grid-bg-dark">
        <div className="wrap grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`py-8 lg:py-10 pr-6 ${i > 0 ? "sm:border-l sm:border-steel-200 sm:pl-6" : ""} border-t border-steel-200 sm:border-t-0 first:border-t-0`}
            >
              <f.icon className="w-5 h-5 text-steel-300" />
              <h3 className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white">{f.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-steel-400">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
