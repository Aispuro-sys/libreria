import React from "react";
import Reveal from "./Reveal";

/** Encabezado de sección reutilizable (tema oscuro). */
export default function SectionHeader({ index, eyebrow, title, description, action }) {
  return (
    <Reveal variant="none" className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-14">
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 eyebrow text-steel-500">
          <span className="font-mono text-mist">{index}</span>
          <span className="w-10 h-px draw-line bg-steel-400"></span>
          {eyebrow}
        </div>
        <h2 className="display mt-3 text-4xl sm:text-5xl md:text-6xl mask-reveal">
          <span className="metal-text">{title}</span>
        </h2>
        {description && (
          <p
            className="mt-4 text-sm sm:text-[15px] leading-relaxed child-up text-steel-600"
            style={{ "--reveal-delay": "250ms" }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}
