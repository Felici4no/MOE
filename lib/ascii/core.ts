/**
 * Núcleo ASCII puro (sem DOM). Compartilhado pela web, pelo PDF e pelo e-mail.
 * Metáfora: relatos (ruído) → padrões (ordem) → descobertas (forma).
 */

/** Rampa de densidade, do vazio ao cheio. Apenas ASCII imprimível. */
export const RAMP = ' .:-=+*#%@';

export function charFor(density: number, ramp = RAMP): string {
  const d = Math.max(0, Math.min(0.9999, density));
  return ramp[Math.floor(d * ramp.length)];
}

/** FNV-1a 32 bits. */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** PRNG determinístico (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruído de valor 2D suave e barato, com semente. */
export function makeNoise(seed = 1) {
  const perm = new Uint8Array(512);
  const r = rng(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const val = (x: number, y: number) => perm[(perm[x & 255] + y) & 511] / 255;
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = fade(x - xi), yf = fade(y - yi);
    const a = val(xi, yi), b = val(xi + 1, yi), c = val(xi, yi + 1), d = val(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

/**
 * Impressão digital ASCII determinística a partir do identificador do relatório.
 * Usa apenas o id (aleatório): nenhum dado pessoal entra no padrão.
 * Espelhada horizontalmente, como um carimbo.
 */
export function fingerprint(id: string, cols = 32, rows = 12): string[] {
  const seed = hash32(`mapa-de-talentos:${id}`);
  const noise = makeNoise(seed);
  const r = rng(seed ^ 0x9e3779b9);
  const fx = 0.18 + r() * 0.2;
  const fy = 0.25 + r() * 0.25;
  const rings = 2 + Math.floor(r() * 3);
  const half = Math.ceil(cols / 2);
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let left = '';
    for (let x = 0; x < half; x++) {
      const dx = (half - x) / half;
      const dy = (y - rows / 2) / (rows / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ring = 0.5 + 0.5 * Math.cos(dist * Math.PI * rings);
      const n = noise(x * fx * 3, y * fy * 3);
      const d = Math.max(0, (ring * 0.6 + n * 0.55) * (1.15 - dist * 0.55) - 0.12);
      left += charFor(d);
    }
    const right = left.split('').reverse().join('').slice(cols % 2);
    lines.push(left + right);
  }
  return lines;
}

/** Arte estática da capa (usada no PDF e como alternativa estática na web). */
export function staticField(cols: number, rows: number, seed = 7, t = 0): string[] {
  const noise = makeNoise(seed);
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const n = noise(x * 0.09 + t, y * 0.16);
      const band = 0.5 + 0.5 * Math.sin((x * 0.11 + y * 0.35) + n * 4);
      line += charFor(Math.pow(band * n * 1.6, 1.3));
    }
    lines.push(line);
  }
  return lines;
}

/** Divisor ASCII determinístico. */
export function dividerPattern(width: number, seed = 3): string {
  const r = rng(seed);
  const glyphs = '-=:.+';
  let s = '';
  for (let i = 0; i < width; i++) s += r() < 0.7 ? '-' : glyphs[Math.floor(r() * glyphs.length)];
  return s;
}
