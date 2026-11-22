import 'server-only';
import { Resend } from 'resend';
import { getConfig } from '@/lib/config';
import { getKV } from '@/lib/store';
import { getReport } from '@/lib/reports';
import { hmac, newCode, normalizeEmail, rateLimit, safeEqual } from '@/lib/security';
import { renderReportPdf, pdfFilename } from '@/lib/pdf/ReportPdf';
import { renderCodeEmail, renderReportEmail, ASSUNTO_CODIGO, ASSUNTO_RELATORIO } from './templates';

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
  idempotencyKey: string;
}
export interface EmailSender {
  send(msg: OutgoingEmail): Promise<{ ok: true } | { ok: false }>;
}

export class ResendSender implements EmailSender {
  constructor(private apiKey: string, private from: string) {}
  async send(msg: OutgoingEmail) {
    const resend = new Resend(this.apiKey);
    try {
      const { error } = await resend.emails.send(
        { from: this.from, to: [msg.to], subject: msg.subject, html: msg.html, attachments: msg.attachments },
        { idempotencyKey: msg.idempotencyKey },
      );
      if (error) {
        console.error('[email] provedor recusou', { tipo: error.name }); // sem endereço, sem conteúdo
        return { ok: false as const };
      }
      return { ok: true as const };
    } catch {
      console.error('[email] falha de rede com o provedor');
      return { ok: false as const };
    }
  }
}

export type Resultado = { status: number; body: Record<string, unknown> };
const r = (status: number, body: Record<string, unknown>): Resultado => ({ status, body });

const CODE_TTL = 600;
const MAX_TENTATIVAS = 5;
const codeKey = (id: string, eh: string) => `email:code:${id}:${eh}`;
const sentKey = (id: string, eh: string) => `email:sent:${id}:${eh}`;

function defaultSender(): EmailSender {
  const cfg = getConfig();
  return new ResendSender(process.env.RESEND_API_KEY!, cfg.email.from);
}

async function checarDocumento(reportId: string): Promise<Resultado | null> {
  if (!getConfig().email.disponivel) return r(503, { erro: 'O envio por e-mail não está disponível neste ambiente.' });
  const doc = await getReport(reportId);
  if (!doc) return r(404, { erro: 'Relatório não encontrado ou expirado.' });
  if (doc.kind === 'demo') return r(403, { erro: 'Documentos de demonstração não são enviados por e-mail.' });
  if (!doc.relatorio) return r(409, { erro: 'Este documento não pode ser enviado.' });
  return null;
}

export async function solicitarCodigo(
  input: { reportId: string; email: string; ip: string },
  sender: EmailSender = defaultSender(),
): Promise<Resultado> {
  const bloqueio = await checarDocumento(input.reportId);
  if (bloqueio) return bloqueio;
  const email = normalizeEmail(input.email);
  const eh = hmac(email);
  const permitido =
    (await rateLimit(`email:ip:${hmac(input.ip)}`, 10, 3600)) &&
    (await rateLimit(`email:rel:${input.reportId}`, 5, 3600)) &&
    (await rateLimit(`email:end:${eh}`, 5, 3600));
  if (!permitido) return r(429, { erro: 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.' });

  const code = newCode();
  await getKV().set(codeKey(input.reportId, eh), { hash: hmac(`${input.reportId}:${eh}:${code}`), tentativas: 0 }, CODE_TTL);
  const enviado = await sender.send({
    to: email,
    subject: ASSUNTO_CODIGO,
    html: await renderCodeEmail(code),
    // Evita duplicar o código num clique duplo dentro do mesmo minuto.
    idempotencyKey: `codigo:${input.reportId}:${eh}:${Math.floor(Date.now() / 60000)}`,
  });
  if (!enviado.ok) {
    await getKV().del(codeKey(input.reportId, eh));
    return r(502, { erro: 'O provedor de e-mail não aceitou o envio agora. Tente de novo em alguns minutos.' });
  }
  return r(200, { status: 'codigo_enviado' });
}

export async function confirmarEnvio(
  input: { reportId: string; email: string; codigo: string },
  sender: EmailSender = defaultSender(),
): Promise<Resultado> {
  const bloqueio = await checarDocumento(input.reportId);
  if (bloqueio) return bloqueio;
  const kv = getKV();
  const email = normalizeEmail(input.email);
  const eh = hmac(email);
  const key = codeKey(input.reportId, eh);
  const rec = await kv.get<{ hash: string; tentativas: number }>(key);
  if (!rec) return r(400, { erro: 'Código expirado ou inválido. Peça um novo código.' });
  if (rec.tentativas >= MAX_TENTATIVAS) {
    await kv.del(key);
    return r(429, { erro: 'Muitas tentativas com código errado. Peça um novo código.' });
  }
  if (!safeEqual(hmac(`${input.reportId}:${eh}:${input.codigo}`), rec.hash)) {
    await kv.set(key, { ...rec, tentativas: rec.tentativas + 1 }, CODE_TTL);
    return r(400, { erro: 'Código incorreto. Confira os 6 números e tente de novo.' });
  }
  await kv.del(key);

  // Uma entrega por documento e endereço: impede duplicação.
  const cfg = getConfig();
  const primeiro = await kv.setIfAbsent(sentKey(input.reportId, eh), 'enviado', cfg.reportTtlDays * 86400);
  if (!primeiro) return r(200, { status: 'ja_enviado' });

  const doc = (await getReport(input.reportId))!;
  const pdf = await renderReportPdf(doc);
  const link = cfg.appBaseUrl ? `${cfg.appBaseUrl.replace(/\/$/, '')}/relatorio/${encodeURIComponent(doc.id)}` : null;
  const enviado = await sender.send({
    to: email,
    subject: ASSUNTO_RELATORIO,
    html: await renderReportEmail(doc, link),
    attachments: [{ filename: pdfFilename(doc), content: pdf }],
    idempotencyKey: `relatorio:${doc.id}:${eh}`,
  });
  if (!enviado.ok) {
    await kv.del(sentKey(input.reportId, eh));
    return r(502, { erro: 'O provedor de e-mail não aceitou o envio agora. Seu código foi usado; peça um novo e tente de novo.' });
  }
  return r(200, { status: 'enviado' });
}
