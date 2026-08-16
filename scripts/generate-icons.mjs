// Generates the FocusFlow PWA icons as PNGs (no external dependencies).
// Pure-JS PNG encoder using Node's built-in zlib.
//
// Run with: npm run icons
//
// Draws a dark "focus timer" mark: a progress ring with a center dot,
// matching public/icons/favicon.svg.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// ---- minimal PNG encoder -------------------------------------------------
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  // compression 0, filter 0, interlace 0 (already zero)
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw[o++] = rgba[i];
      raw[o++] = rgba[i + 1];
      raw[o++] = rgba[i + 2];
      raw[o++] = rgba[i + 3];
    }
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---- drawing ---------------------------------------------------------------
const BG = [25, 25, 24]; // night background
const TRACK = [48, 48, 45]; // night-card2
const ARC = [230, 0, 35]; // accent red
const DOT = [255, 255, 255]; // white dot

function sample(x, y, size, opts) {
  const c = size / 2;
  const hw = c;
  const hh = c;

  // Rounded-rect background (full-bleed square for maskable icons).
  const radius = opts.maskable ? 0 : size * 0.22;
  const qx = Math.abs(x - c) - (hw - radius);
  const qy = Math.abs(y - c) - (hh - radius);
  const dRound = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  if (dRound > radius) return [0, 0, 0, 0];

  // Progress ring (kept inside the maskable safe zone for maskable variants).
  const R = size * (opts.maskable ? 0.3 : 0.36);
  const thick = size * 0.09;
  const dist = Math.hypot(x - c, y - c);
  if (dist >= R - thick && dist <= R) {
    // Normalize angle to [0, 2PI) measured from the +x axis, y pointing down.
    const a = (Math.atan2(y - c, x - c) + Math.PI * 2) % (Math.PI * 2);
    const start = (Math.PI * 3) / 2; // top (12 o'clock)
    const end = start + opts.progress * Math.PI * 2;
    const filled = end <= Math.PI * 2 ? a >= start && a <= end : a >= start || a <= end - Math.PI * 2;
    return filled ? [...ARC, 255] : [...TRACK, 255];
  }
  if (dist <= size * 0.055) return [...DOT, 255];
  return [...BG, 255];
}

function render(size, opts) {
  const ss = 3; // supersampling for smooth edges
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const [pr, pg, pb, pa] = sample(x + (sx + 0.5) / ss, y + (sy + 0.5) / ss, size, opts);
          r += pr;
          g += pg;
          b += pb;
          a += pa;
        }
      }
      const n = ss * ss;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = Math.round(a / n);
    }
  }
  return encodePng(size, size, rgba);
}

const targets = [
  ['icon-192.png', 192, { maskable: false, progress: 0.62 }],
  ['icon-512.png', 512, { maskable: false, progress: 0.62 }],
  ['maskable-192.png', 192, { maskable: true, progress: 0.62 }],
  ['maskable-512.png', 512, { maskable: true, progress: 0.62 }],
  ['apple-touch-icon.png', 180, { maskable: false, progress: 0.62 }],
  ['favicon-32.png', 32, { maskable: false, progress: 0.62 }],
];

for (const [name, size, opts] of targets) {
  writeFileSync(join(OUT, name), render(size, opts));
  console.log(`✓ ${name} (${size}px)`);
}
console.log('Icons written to public/icons/');
