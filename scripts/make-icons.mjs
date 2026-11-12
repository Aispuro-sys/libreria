// Genera los iconos PNG de la PWA a partir de un SVG (sharp)
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const svg = (size, pad = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="m" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b3b42"/>
      <stop offset="0.4" stop-color="#141416"/>
      <stop offset="0.6" stop-color="#2a2a30"/>
      <stop offset="1" stop-color="#0a0a0a"/>
    </linearGradient>
    <linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.45" stop-color="#d4d4d8"/>
      <stop offset="0.7" stop-color="#8e8e96"/>
      <stop offset="1" stop-color="#e4e4e7"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#m)" rx="${pad ? size * 0.18 : 0}"/>
  <g transform="translate(${size * 0.5},${size * 0.5})">
    <path d="M ${-size * 0.22} ${-size * 0.20} v ${size * 0.40} c ${size * 0.07} ${-size * 0.03} ${size * 0.15} ${-size * 0.03} ${size * 0.22} 0 v ${-size * 0.40} c ${-size * 0.07} ${-size * 0.03} ${-size * 0.15} ${-size * 0.03} ${-size * 0.22} 0 z" fill="url(#t)"/>
    <path d="M ${size * 0.22} ${-size * 0.20} v ${size * 0.40} c ${-size * 0.07} ${-size * 0.03} ${-size * 0.15} ${-size * 0.03} ${-size * 0.22} 0 v ${-size * 0.40} c ${size * 0.07} ${-size * 0.03} ${size * 0.15} ${-size * 0.03} ${size * 0.22} 0 z" fill="url(#t)"/>
    <rect x="${-size * 0.012}" y="${-size * 0.20}" width="${size * 0.024}" height="${size * 0.40}" fill="#0a0a0a"/>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });

await sharp(Buffer.from(svg(192))).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(svg(512))).png().toFile("public/icons/icon-512.png");
// apple-touch-icon: sin transparencia, 180x180
await sharp(Buffer.from(svg(180))).png().toFile("public/icons/apple-touch-icon.png");
// maskable con margen de seguridad
await sharp(Buffer.from(svg(512, 1)))
  .png()
  .toFile("public/icons/icon-512-maskable.png");

console.log("Iconos generados en public/icons/");
