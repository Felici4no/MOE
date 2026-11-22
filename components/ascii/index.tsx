'use client';

/**
 * Sistema ASCII do Mapa de Talentos.
 * Uma única gramática visual: ruído (relatos) → padrão (análise) → forma (descoberta).
 * Todos os componentes são decorativos (aria-hidden) e respeitam prefers-reduced-motion.
 */
import { useMemo } from 'react';
import { AsciiCanvas, type Shader } from './AsciiCanvas';
import { makeNoise, fingerprint, dividerPattern } from '@/lib/ascii/core';

const noise = makeNoise(11);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* -------------------------------------------------------------------------- */
/* AsciiField — campo de caracteres que responde devagar ao ponteiro e à rolagem */
/* -------------------------------------------------------------------------- */

const fieldShader: Shader = ({ x, y, cols, rows, t, px, py, scroll }) => {
  const nx = x / cols, ny = y / rows;
  // Ruído: relatos soltos.
  const n = noise(x * 0.07 + t * 0.12, y * 0.13 - t * 0.05 + scroll * 6);
  // Perto do ponteiro, o ruído se organiza em faixas: um padrão emerge.
  const dx = (nx - px) * (cols / rows) * 0.5, dy = ny - py;
  const near = 1 - smooth(0.05, 0.42, Math.sqrt(dx * dx + dy * dy));
  const stripes = 0.5 + 0.5 * Math.sin(x * 0.55 + Math.round(n * 3) * 1.4 + t * 0.6);
  const ordered = Math.round(stripes * 3) / 3;
  // Mais denso à direita: o título vive à esquerda.
  const fade = smooth(0.0, 0.85, nx) * 0.9 + 0.1;
  return Math.pow(n * (1 - near) + ordered * near, 1.6) * fade * 1.25;
};

export function AsciiField({ className, cell = 14 }: { className?: string; cell?: number }) {
  return (
    <div className={`overflow-hidden ${className ?? 'relative h-full w-full'}`} aria-hidden="true">
      <AsciiCanvas shader={fieldShader} cell={cell} interactive />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* AsciiPortrait — identidade, voz e pensamento: um perfil feito de ondas      */
/* -------------------------------------------------------------------------- */

const portraitShader: Shader = ({ x, y, cols, rows, t }) => {
  const aspect = 0.55; // proporção do caractere
  const cx = cols * 0.4, cy = rows * 0.5;
  const dx = ((x - cx) * aspect) / rows, dy = (y - cy) / rows;
  // Cabeça: elipse com textura.
  const head = 1 - smooth(0.26, 0.3, Math.sqrt((dx * 1.15) ** 2 + (dy * 0.95) ** 2));
  const tex = noise(x * 0.25, y * 0.35 + t * 0.15);
  // Voz: anéis saindo para a direita.
  const r = Math.sqrt((dx - 0.12) ** 2 + dy * dy);
  const right = smooth(0.1, 0.3, dx);
  const rings = (0.5 + 0.5 * Math.cos(r * 38 - t * 2.2)) * right * (1 - smooth(0.35, 0.75, r));
  // Pensamento: pontos dispersos acima.
  const thought = noise(x * 0.5 + t * 0.4, y * 0.5) > 0.82 && dy < -0.25 ? 0.5 : 0;
  return Math.max(head * (0.35 + tex * 0.65), rings * 0.85, thought);
};

export function AsciiPortrait({ className, cell = 12 }: { className?: string; cell?: number }) {
  return (
    <div className={`overflow-hidden ${className ?? 'relative h-full w-full'}`} aria-hidden="true">
      <AsciiCanvas shader={portraitShader} cell={cell} fps={18} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* AsciiWave — onda que reage ao nível de áudio quando ele existe              */
/* -------------------------------------------------------------------------- */

export function AsciiWave({ className, readLevel, mode = 'idle', cell = 14 }: {
  className?: string;
  /** Nível 0..1 de áudio real, ou null quando não há áudio. */
  readLevel?: () => number | null;
  /** 'idle' sem áudio; 'speaking' quando a Lia fala (sem áudio real, só ritmo visual) */
  mode?: 'idle' | 'speaking' | 'listening' | 'paused';
  cell?: number;
}) {
  const shader = useMemo<Shader>(() => {
    return ({ x, y, cols, rows, t, value }) => {
      const mid = rows / 2;
      const base = mode === 'paused' ? 0.04 : mode === 'speaking' ? 0.22 : mode === 'listening' ? 0.12 : 0.08;
      const amp = Math.min(0.48, base + value * 0.9) * rows;
      const env = Math.sin((x / cols) * Math.PI);
      const k = mode === 'paused' ? 0 : t;
      const h = Math.sin(x * 0.18 + k * 2.4) * Math.cos(x * 0.045 - k * 0.7) * amp * env;
      const d = Math.abs(y - mid - h);
      const core = 1 - smooth(0.2, 1.6, d);
      const halo = (1 - smooth(1.2, 4 + value * 6, d)) * noise(x * 0.4 + k, y * 0.6) * 0.6;
      return Math.max(core, halo);
    };
  }, [mode]);
  return (
    <div className={`overflow-hidden ${className ?? 'relative h-full w-full'}`} aria-hidden="true">
      <AsciiCanvas shader={shader} cell={cell} fps={30} readValue={readLevel ? () => readLevel() ?? 0 : undefined} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* AsciiProcessing — caos se ordenando conforme o andamento REAL               */
/* -------------------------------------------------------------------------- */

export function AsciiProcessing({ className, progress, failed = false }: { className?: string; progress: number; failed?: boolean }) {
  const shader = useMemo<Shader>(() => ({ x, y, rows, t }) => {
    const chaos = noise(x * 0.3 + t * 1.5, y * 0.5 - t);
    const grid = (x % 6 === 0 || y % 3 === 0) ? 0.75 : 0.12;
    const p = failed ? 0.15 : progress;
    const scan = Math.abs(y - ((t * 6) % (rows + 4)) + 2) < 1 && !failed && p < 1 ? 0.95 : 0;
    const mixd = chaos * (1 - p) + grid * p;
    return Math.max(scan, failed ? (chaos > 0.7 ? 0.9 : 0.05) : mixd);
  }, [progress, failed]);
  return (
    <div className={`overflow-hidden ${className ?? 'relative h-full w-full'}`} aria-hidden="true">
      <AsciiCanvas shader={shader} cell={13} fps={20} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* AsciiDivider — separador animado entre capítulos                            */
/* -------------------------------------------------------------------------- */

export function AsciiDivider({ label, seed = 3, className }: { label?: string; seed?: number; className?: string }) {
  const pattern = useMemo(() => dividerPattern(180, seed), [seed]);
  return (
    <div className={`ascii-divider ${className ?? ''}`}>
      {label && (
        <span className="meta shrink-0 bg-ink px-3 py-2 text-paper" style={{ position: 'relative', zIndex: 1 }}>{label}</span>
      )}
      <div className="ascii ascii-faint overflow-hidden py-2 text-[13px]" aria-hidden="true">
        <div className="ascii-divider__track"><span>{pattern}</span><span>{pattern}</span></div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* AsciiFingerprint — padrão determinístico do identificador do relatório      */
/* -------------------------------------------------------------------------- */

export function AsciiFingerprint({ id, cols = 32, rows = 12, className }: { id: string; cols?: number; rows?: number; className?: string }) {
  const lines = useMemo(() => fingerprint(id, cols, rows), [id, cols, rows]);
  return <pre className={`ascii m-0 ${className ?? ''}`} aria-hidden="true">{lines.join('\n')}</pre>;
}

/* -------------------------------------------------------------------------- */
/* AsciiGlyph — pequenos gráficos estáticos para capítulos                     */
/* -------------------------------------------------------------------------- */

export const GLYPHS = {
  conversa: [
    '  .-------------.   ',
    '  | ~~ ~~~ ~ ~~ |   ',
    '  | ~~~~ ~~ ~~~ |   ',
    "  '----.  .-----'   ",
    "        \\/  ~ ~ ~   ",
    '   ))) ((( ))) (((  ',
  ],
  descubra: [
    ' . : . : . : . : .  ',
    ' : . + . : . + . :  ',
    ' . + # + . + # + .  ',
    ' : . + . : . + . :  ',
    ' . : . : # : . : .  ',
    ' : . : . : . : . :  ',
  ],
  receba: [
    '  .--------------.  ',
    '  | MAPA ======= |  ',
    '  | ##  -------- |  ',
    '  | ##  -------- |  ',
    '  | ------- ---- |  ',
    "  '--------------'  ",
  ],
};

export function AsciiGlyph({ name, className }: { name: keyof typeof GLYPHS; className?: string }) {
  return <pre className={`ascii m-0 text-[13px] leading-[1.15] ${className ?? ''}`} aria-hidden="true">{GLYPHS[name].join('\n')}</pre>;
}
