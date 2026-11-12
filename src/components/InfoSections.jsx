import React from "react";
import { Headphones, Play, Pause, Gauge, Share, PlusSquare, WifiOff } from "lucide-react";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";

/** Sección 02 — cómo funciona el modo audiolibro. */
export function AudiobookSection() {
  const steps = [
    { n: "1", t: "Abre un libro", d: "Pulsa «Leer» o el icono de auriculares en cualquier tarjeta." },
    { n: "2", t: "Activa «Escuchar»", d: "El lector extrae el texto de la página y lo narra en español." },
    { n: "3", t: "Deja que fluya", d: "Al terminar una página pasa a la siguiente solo, como un audiolibro real." },
  ];
  return (
    <section id="audiolibro" className="metal-dark grid-bg-dark border-y border-steel-200">
      <div className="wrap py-20 sm:py-28">
        <SectionHeader
          index="02"
          eyebrow="Audiolibro"
          title="Escucha"
          description="El modo audiolibro convierte cada página en voz usando la síntesis del propio dispositivo — sin servidores, sin cuentas y también disponible offline una vez descargado el libro."
        />
        <Reveal stagger={100} className="grid grid-cols-1 md:grid-cols-3 gap-px bg-steel-200 border border-steel-200">
          {steps.map((s) => (
            <div key={s.n} className="bg-steel-50 p-8">
              <div className="display text-5xl metal-text">{s.n}</div>
              <h3 className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-mist">{s.t}</h3>
              <p className="mt-2 text-xs leading-relaxed text-steel-500">{s.d}</p>
            </div>
          ))}
        </Reveal>
        <Reveal variant="up" className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-steel-500">
          <span className="inline-flex items-center gap-2 text-xs"><Play className="w-3.5 h-3.5" /> Reproduce frase a frase</span>
          <span className="inline-flex items-center gap-2 text-xs"><Pause className="w-3.5 h-3.5" /> Pausa y retoma donde ibas</span>
          <span className="inline-flex items-center gap-2 text-xs"><Gauge className="w-3.5 h-3.5" /> Velocidad 0.8x–2x</span>
          <span className="inline-flex items-center gap-2 text-xs"><Headphones className="w-3.5 h-3.5" /> Resaltado de la frase narrada</span>
        </Reveal>
      </div>
    </section>
  );
}

/** Sección 03 — instrucciones de instalación como PWA en iPhone. */
export function InstallSection() {
  return (
    <section id="instalar" className="wrap py-20 sm:py-28">
      <SectionHeader
        index="03"
        eyebrow="Instalar en iPhone"
        title="Como App"
        description="Esta web es una PWA: se instala en la pantalla de inicio de tu iPhone y funciona a pantalla completa, con caché offline para los libros que descargues."
      />
      <Reveal stagger={100} className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-steel-200 border border-steel-200">
        {[
          {
            icon: Share,
            t: "Abre en Safari",
            d: "Entra a la dirección de esta web desde Safari en tu iPhone y pulsa el botón Compartir.",
          },
          {
            icon: PlusSquare,
            t: "«Añadir a inicio»",
            d: "Desliza y elige «Añadir a pantalla de inicio». Aparecerá el icono Biblioteca.",
          },
          {
            icon: WifiOff,
            t: "Úsala offline",
            d: "Descarga los libros con el icono de flecha en cada tarjeta y léelos sin internet.",
          },
        ].map((s) => (
          <div key={s.t} className="bg-steel-50 p-8">
            <s.icon className="w-6 h-6 text-mist" />
            <h3 className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-mist">{s.t}</h3>
            <p className="mt-2 text-xs leading-relaxed text-steel-500">{s.d}</p>
          </div>
        ))}
      </Reveal>
      <Reveal variant="up" className="mt-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-steel-400">
          Nota — en tu red local abre la IP que muestra Vite (p. ej. http://192.168.x.x:4173)
        </p>
      </Reveal>
    </section>
  );
}
