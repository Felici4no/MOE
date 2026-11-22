import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryKV, __setKVForTests } from '@/lib/store';
import { saveReport } from '@/lib/reports';
import { buildReportDocument } from '@/lib/domain/report';
import { solicitarCodigo, confirmarEnvio, type EmailSender, type OutgoingEmail } from '@/lib/email/service';

const ID = 'BBBBBBBBBBBBBBBBBBBBBB';
const EMAIL = 'pessoa.teste@example.com';

class FakeSender implements EmailSender {
  sent: OutgoingEmail[] = [];
  fail = false;
  async send(msg: OutgoingEmail) {
    if (this.fail) return { ok: false as const };
    this.sent.push(msg);
    return { ok: true as const };
  }
}

const codeFrom = (m: OutgoingEmail) => /(\d{6})/.exec(m.html.replace(/<[^>]+>/g, ' '))![1];

async function seed() {
  const doc = buildReportDocument({
    id: ID, kind: 'real', projectName: 'Piloto', clientName: null, createdAt: '2026-11-22T12:00:00Z',
    transcricao: 'PESSOA: Eu vi que o preço estava errado.\nPESSOA: Eu conferi o troco e avisei.',
    analise: { nome: 'Ana', alerta_bem_estar: false, talentos: [{ tema: 'Olho Clínico', dominio: 'FAZER ACONTECER', evidencias: ['Eu vi que o preço estava errado.', 'Eu conferi o troco e avisei.'] }] },
  });
  await saveReport(doc, 30);
}

describe('envio por e-mail (ambiente seguro, provedor falso)', () => {
  let sender: FakeSender;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_fake');
    vi.stubEnv('EMAIL_FROM', 'Mapa <mapa@example.com>');
    vi.stubEnv('EMAIL_HASH_SECRET', 'segredo-de-teste-com-32-caracteres!!');
    vi.stubEnv('NODE_ENV', 'test');
    __setKVForTests(new MemoryKV());
    sender = new FakeSender();
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await seed();
  });
  afterEach(() => { vi.unstubAllEnvs(); errSpy.mockRestore(); });

  it('fica indisponível sem credenciais, sem fingir envio', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const r = await solicitarCodigo({ reportId: ID, email: EMAIL, ip: '1.1.1.1' }, sender);
    expect(r.status).toBe(503);
    expect(sender.sent).toHaveLength(0);
  });

  it('recusa documentos de demonstração', async () => {
    const r = await solicitarCodigo({ reportId: 'demo-tres', email: EMAIL, ip: '1.1.1.1' }, sender);
    expect(r.status).toBe(403);
  });

  it('não envia relatório antes de verificar o endereço', async () => {
    await solicitarCodigo({ reportId: ID, email: EMAIL, ip: '1.1.1.1' }, sender);
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0].attachments).toBeUndefined();
    const errado = await confirmarEnvio({ reportId: ID, email: EMAIL, codigo: '000000' === codeFrom(sender.sent[0]) ? '111111' : '000000' }, sender);
    expect(errado.status).toBe(400);
    expect(sender.sent).toHaveLength(1);
  });

  it('fluxo completo: código → PDF anexado, assunto correto, sem transcrição', async () => {
    await solicitarCodigo({ reportId: ID, email: EMAIL.toUpperCase(), ip: '1.1.1.1' }, sender);
    const r = await confirmarEnvio({ reportId: ID, email: EMAIL, codigo: codeFrom(sender.sent[0]) }, sender);
    expect(r).toEqual({ status: 200, body: { status: 'enviado' } });
    const msg = sender.sent[1];
    expect(msg.subject).toBe('Seu Mapa de Talentos está pronto.');
    expect(msg.to).toBe(EMAIL);
    expect(msg.attachments![0].filename).toMatch(/\.pdf$/);
    expect(msg.attachments![0].content.subarray(0, 5).toString()).toBe('%PDF-');
    expect(msg.html).not.toContain('PESSOA:');
    expect(msg.html).not.toContain('Eu vi que o preço');
  });

  it('evita envio duplicado do mesmo documento ao mesmo endereço', async () => {
    await solicitarCodigo({ reportId: ID, email: EMAIL, ip: '1.1.1.1' }, sender);
    await confirmarEnvio({ reportId: ID, email: EMAIL, codigo: codeFrom(sender.sent[0]) }, sender);
    await solicitarCodigo({ reportId: ID, email: EMAIL, ip: '1.1.1.1' }, sender);
    const r = await confirmarEnvio({ reportId: ID, email: EMAIL, codigo: codeFrom(sender.sent[2]) }, sender);
    expect(r.body.status).toBe('ja_enviado');
    expect(sender.sent.filter(m => m.attachments)).toHaveLength(1);
  });

  it('código não pode ser reutilizado', async () => {
    await solicitarCodigo({ reportId: ID, email: EMAIL, ip: '1.1.1.1' }, sender);
    const code = codeFrom(sender.sent[0]);
    await confirmarEnvio({ reportId: ID, email: EMAIL, codigo: code }, sender);
    const again = await confirmarEnvio({ reportId: ID, email: EMAIL, codigo: code }, sender);
    expect(again.status).toBe(400);
  });

  it('bloqueia após 5 tentativas erradas', async () => {
    await solicitarCodigo({ reportId: ID, email: EMAIL, ip: '1.1.1.1' }, sender);
    const certo = codeFrom(sender.sent[0]);
    const errado = certo === '123456' ? '654321' : '123456';
    for (let i = 0; i < 5; i++) await confirmarEnvio({ reportId: ID, email: EMAIL, codigo: errado }, sender);
    const r = await confirmarEnvio({ reportId: ID, email: EMAIL, codigo: certo }, sender);
    expect(r.status).toBe(429);
  });

  it('limita solicitações', async () => {
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await solicitarCodigo({ reportId: ID, email: EMAIL, ip: '2.2.2.2' }, sender)).status);
    expect(results.slice(0, 5).every(s => s === 200)).toBe(true);
    expect(results[5]).toBe(429);
  });

  it('erro do provedor não marca como enviado nem expõe o endereço nos logs', async () => {
    await solicitarCodigo({ reportId: ID, email: EMAIL, ip: '1.1.1.1' }, sender);
    sender.fail = true;
    const r = await confirmarEnvio({ reportId: ID, email: EMAIL, codigo: codeFrom(sender.sent[0]) }, sender);
    expect(r.status).toBe(502);
    // Nova tentativa depois da falha consegue enviar (marca de envio foi desfeita).
    sender.fail = false;
    await solicitarCodigo({ reportId: ID, email: EMAIL, ip: '1.1.1.1' }, sender);
    const ok = await confirmarEnvio({ reportId: ID, email: EMAIL, codigo: codeFrom(sender.sent[1]) }, sender);
    expect(ok.body.status).toBe('enviado');
    const logs = JSON.stringify(errSpy.mock.calls);
    expect(logs).not.toContain(EMAIL);
  });
});
