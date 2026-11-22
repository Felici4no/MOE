'use client';

import { useEffect, useRef } from 'react';

export interface ShaderCtx {
  x: number; y: number; cols: number; rows: number;
  /** tempo em segundos */
  t: number;
  /** ponteiro suavizado, 0..1 (0.5 = centro) */
  px: number; py: number;
  /** progresso de rolagem suavizado da página, 0..1 */
  scroll: number;
  /** valor externo (nível de áudio, progresso etc.) 0..1 */
  value: number;
}

export type Shader = (c: ShaderCtx) => number;

interface Props {
  shader: Shader;
  /** tamanho da fonte em px */
  cell?: number;
  fps?: number;
  className?: string;
  /** leitura de valor externo a cada quadro (ex.: nível de microfone) */
  readValue?: () => number;
  interactive?: boolean;
  ramp?: string;
}

const DEFAULT_RAMP = ' .:-=+*#%@';

function prefersStatic(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return true;
  if ((nav.hardwareConcurrency ?? 8) <= 2) return true;
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return true;
  return false;
}

/**
 * Motor de renderização ASCII em <canvas>. Decorativo: sempre aria-hidden.
 * - pausa fora da tela e com a aba oculta;
 * - quadro único estático com movimento reduzido ou aparelho modesto;
 * - o tamanho vem do contêiner (sem layout shift).
 */
export function AsciiCanvas({ shader, cell = 14, fps = 24, className, readValue, interactive = false, ramp = DEFAULT_RAMP }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const shaderRef = useRef(shader);
  const readRef = useRef(readValue);
  useEffect(() => { shaderRef.current = shader; readRef.current = readValue; });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isStatic = prefersStatic();
    let cols = 0, rows = 0, cw = 0, lh = 0, color = '#111', font = '';
    let raf = 0, visible = true, last = 0;
    const start = performance.now();
    const target = { px: 0.5, py: 0.5 };
    const c: ShaderCtx = { x: 0, y: 0, cols: 0, rows: 0, t: 0, px: 0.5, py: 0.5, scroll: 0, value: 0 };

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const style = getComputedStyle(canvas);
      color = style.color;
      const size = rect.width < 520 ? Math.max(9, cell - 3) : cell;
      font = `${size}px ${style.fontFamily}`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = font;
      cw = ctx.measureText('M').width || size * 0.6;
      lh = size * 1.12;
      cols = Math.max(1, Math.floor(rect.width / cw));
      rows = Math.max(1, Math.floor(rect.height / lh));
    };

    const draw = (now: number) => {
      c.t = (now - start) / 1000;
      c.px += (target.px - c.px) * 0.035;
      c.py += (target.py - c.py) * 0.035;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const s = max > 0 ? window.scrollY / max : 0;
      c.scroll += (s - c.scroll) * 0.05;
      c.value = readRef.current ? readRef.current() : 0;
      c.cols = cols; c.rows = rows;
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = color;
      ctx.font = font;
      ctx.textBaseline = 'top';
      const fn = shaderRef.current;
      const n = ramp.length;
      for (let y = 0; y < rows; y++) {
        let line = '';
        c.y = y;
        for (let x = 0; x < cols; x++) {
          c.x = x;
          const d = fn(c);
          line += ramp[Math.max(0, Math.min(n - 1, Math.floor(d * n)))];
        }
        ctx.fillText(line, 0, y * lh);
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      if (now - last < 1000 / fps) return;
      last = now;
      draw(now);
    };

    measure();
    draw(start);

    const ro = new ResizeObserver(() => { measure(); draw(performance.now()); });
    ro.observe(canvas);
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => { measure(); draw(performance.now()); };
    scheme.addEventListener('change', onScheme);
    // Fontes web chegam depois do primeiro quadro.
    document.fonts?.ready.then(() => { measure(); draw(performance.now()); }).catch(() => {});

    if (isStatic && !readRef.current) {
      return () => { ro.disconnect(); scheme.removeEventListener('change', onScheme); };
    }

    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(canvas);
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      target.px = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      target.py = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    };
    if (interactive && !isStatic) window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      scheme.removeEventListener('change', onScheme);
      window.removeEventListener('pointermove', onMove);
    };
  }, [cell, fps, interactive, ramp]);

  return <canvas ref={ref} className={`ascii-canvas ${className ?? ''}`} aria-hidden="true" />;
}
