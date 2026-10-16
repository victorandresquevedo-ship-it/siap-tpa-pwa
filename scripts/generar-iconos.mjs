// Genera los íconos PNG de la PWA (sigla "SIAP" en blanco sobre azul marino, con la barra naranja
// de la presentación) sin dependencias: dibuja figuras geométricas con antialiasing y escribe PNG
// con zlib. Uso: npm run iconos

import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const AZUL = [0x21, 0x29, 0x5c];
const BLANCO = [0xff, 0xff, 0xff];
const NARANJA = [0xe8, 0x96, 0x3d];

// ---------- Figuras en un lienzo de 100 × 100 unidades ----------

const largo = (x, y) => Math.hypot(x, y);

function enRect(x, y, x0, y0, x1, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

/** Distancia con signo a una caja redondeada (negativa adentro). */
function dCajaRedondeada(x, y, x0, y0, x1, y1, r) {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const qx = Math.abs(x - cx) - ((x1 - x0) / 2 - r);
  const qy = Math.abs(y - cy) - ((y1 - y0) / 2 - r);
  return largo(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function enCapsula(x, y, ax, ay, bx, by, r) {
  const px = x - ax;
  const py = y - ay;
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)));
  return largo(px - dx * t, py - dy * t) <= r;
}

function enAnillo(x, y, cx, cy, radio, grosor) {
  return Math.abs(largo(x - cx, y - cy) - radio) <= grosor / 2;
}

// Letras de trazo grueso (sans geométrica). Alto de mayúscula h, grosor w.
const h = 24;
const w = 5.2;
const rp = (h / 2 - w / 2) / 2; // radio de los arcos de la S
const ANCHO = { S: 2 * rp + w, I: w, A: 19.5, P: 13.5 };
const ESPACIO = 3.6;

function letraS(x, y) {
  const cx = ANCHO.S / 2;
  const c1 = w / 2 + rp;
  const c2 = h - w / 2 - rp;
  const arriba = enAnillo(x, y, cx, c1, rp, w) && !(x > cx && y > c1);
  const abajo = enAnillo(x, y, cx, c2, rp, w) && !(x < cx && y < c2);
  return arriba || abajo;
}

function letraI(x, y) {
  return enRect(x, y, 0, 0, w, h);
}

function letraA(x, y) {
  if (y < 0 || y > h) return false;
  const W = ANCHO.A;
  const pierna = (bx) => enCapsula(x, y, bx, h + w, W / 2, w / 2, w / 2);
  const barra = enRect(x, y, W * 0.25, h * 0.66, W * 0.75, h * 0.66 + w * 0.75);
  return pierna(w / 2) || pierna(W - w / 2) || barra;
}

function letraP(x, y) {
  const tallo = enRect(x, y, 0, 0, w, h);
  const alto = h * 0.58;
  const panza = Math.abs(dCajaRedondeada(x, y, w / 2, w / 2, ANCHO.P - w / 2, alto - w / 2, (alto - w) / 2)) <= w / 2;
  return tallo || panza;
}

const LETRAS = [
  ['S', letraS],
  ['I', letraI],
  ['A', letraA],
  ['P', letraP],
];
const ANCHO_TEXTO = LETRAS.reduce((s, [l]) => s + ANCHO[l], 0) + ESPACIO * (LETRAS.length - 1);

/** Color de un punto del ícono (unidades 0–100) o null si es transparente. */
function colorEn(x, y, { redondeado, escala }) {
  // El contenido se escala desde el centro (los íconos "maskable" lo achican a la zona segura).
  const u = 50 + (x - 50) / escala;
  const v = 50 + (y - 50) / escala;

  if (redondeado && dCajaRedondeada(x, y, 0, 0, 100, 100, 20) > 0) return null;

  if (dCajaRedondeada(u, v, 24, 64, 76, 69.5, 2.75) <= 0) return NARANJA;

  let x0 = 50 - ANCHO_TEXTO / 2;
  const y0 = 33;
  for (const [l, dentro] of LETRAS) {
    if (u >= x0 - 1 && u <= x0 + ANCHO[l] + 1 && dentro(u - x0, v - y0)) return BLANCO;
    x0 += ANCHO[l] + ESPACIO;
  }
  return AZUL;
}

function dibujar(tamano, opciones) {
  const muestras = 5; // 5 × 5 muestras por píxel para suavizar bordes
  const pixeles = Buffer.alloc(tamano * tamano * 4);
  for (let py = 0; py < tamano; py++) {
    for (let px = 0; px < tamano; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < muestras; sy++) {
        for (let sx = 0; sx < muestras; sx++) {
          const x = ((px + (sx + 0.5) / muestras) / tamano) * 100;
          const y = ((py + (sy + 0.5) / muestras) / tamano) * 100;
          const c = colorEn(x, y, opciones);
          if (!c) continue;
          r += c[0];
          g += c[1];
          b += c[2];
          a++;
        }
      }
      const i = (py * tamano + px) * 4;
      const total = muestras * muestras;
      pixeles[i] = a ? Math.round(r / a) : 0;
      pixeles[i + 1] = a ? Math.round(g / a) : 0;
      pixeles[i + 2] = a ? Math.round(b / a) : 0;
      pixeles[i + 3] = Math.round((a / total) * 255);
    }
  }
  return pixeles;
}

// ---------- PNG ----------

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function trozo(tipo, datos) {
  const largoB = Buffer.alloc(4);
  largoB.writeUInt32BE(datos.length);
  const tipoYDatos = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tipoYDatos));
  return Buffer.concat([largoB, tipoYDatos, crc]);
}

function png(tamano, pixeles) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tamano, 0);
  ihdr.writeUInt32BE(tamano, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  const filas = Buffer.alloc(tamano * (tamano * 4 + 1));
  for (let y = 0; y < tamano; y++) {
    filas[y * (tamano * 4 + 1)] = 0; // sin filtro
    pixeles.copy(filas, y * (tamano * 4 + 1) + 1, y * tamano * 4, (y + 1) * tamano * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(filas, { level: 9 })),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Íconos ----------

const ICONOS = [
  { archivo: 'icon-192.png', tamano: 192, redondeado: true, escala: 1 },
  { archivo: 'icon-512.png', tamano: 512, redondeado: true, escala: 1 },
  // "maskable": fondo completo y contenido dentro de la zona segura (círculo del 80%).
  { archivo: 'icon-maskable-512.png', tamano: 512, redondeado: false, escala: 0.78 },
  // iOS redondea solo; sin transparencia.
  { archivo: 'apple-touch-icon-180.png', tamano: 180, redondeado: false, escala: 0.9 },
];

const carpeta = new URL('../public/icons/', import.meta.url);
mkdirSync(carpeta, { recursive: true });
for (const { archivo, tamano, ...opciones } of ICONOS) {
  const datos = png(tamano, dibujar(tamano, opciones));
  writeFileSync(new URL(archivo, carpeta), datos);
  console.log(`public/icons/${archivo} (${tamano}×${tamano}, ${datos.length} bytes)`);
}
