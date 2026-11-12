import React, { useEffect, useRef, useState } from "react";

/** Devuelve [ref, inView]. Se dispara una sola vez por defecto. */
export function useInView({ threshold = 0.15, rootMargin = "0px 0px -8% 0px", once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { setInView(true); return; }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.unobserve(el);
        } else if (!once) setInView(false);
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView];
}

/**
 * Envoltorio que anima su contenido al entrar en el viewport.
 * variant: up | down | left | right | scale | blur | none
 */
export default function Reveal({
  as: Tag = "div",
  variant = "up",
  delay = 0,
  duration = 700,
  stagger = 0,
  className = "",
  children,
  ...rest
}) {
  const [ref, inView] = useInView();
  const style = {
    "--reveal-delay": `${delay}ms`,
    "--reveal-duration": `${duration}ms`,
    ...(stagger ? { "--reveal-stagger": `${stagger}ms` } : {}),
    ...rest.style,
  };
  return (
    <Tag
      ref={ref}
      {...rest}
      style={style}
      data-variant={variant}
      className={`reveal ${stagger ? "reveal-stagger" : ""} ${inView ? "in" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Contador animado: respeta prefijos/sufijos ("6 libros", "31 MB"). */
export function CountUp({ value, duration = 1400, className = "" }) {
  const [ref, inView] = useInView({ threshold: 0.5 });
  const match = String(value).match(/^([^\d]*)(\d+(?:\.\d+)?)(.*)$/);
  const [display, setDisplay] = useState(match ? `${match[1]}0${match[3]}` : value);

  useEffect(() => {
    if (!inView || !match) return;
    const prefix = match[1], target = parseFloat(match[2]), suffix = match[3];
    const decimals = (match[2].split(".")[1] || "").length;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDisplay(value); return; }
    let raf, start;
    const tick = (t) => {
      start ??= t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(`${prefix}${(target * eased).toFixed(decimals)}${suffix}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={ref} className={className}>{display}</span>;
}
