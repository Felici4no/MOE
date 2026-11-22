import 'server-only';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { getKV } from '@/lib/store';

/** Identificador de relatório real: 128 bits aleatórios, base64url. Não previsível. */
export function newReportId(): string {
  return randomBytes(16).toString('base64url');
}

export const REAL_ID_RE = /^[A-Za-z0-9_-]{22}$/;

function secret() {
  const s = process.env.EMAIL_HASH_SECRET;
  if (!s || s.length < 16) throw new Error('EMAIL_HASH_SECRET ausente');
  return s;
}

/** Hash com segredo: permite chavear e-mails sem guardá-los em claro nem em logs. */
export function hmac(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Janela fixa simples. Retorna true se ainda dentro do limite. */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  const n = await getKV().incr(`rl:${bucket}`, windowSeconds);
  return n <= limit;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'local').trim();
}
