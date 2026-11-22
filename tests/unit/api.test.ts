import { describe, it, expect, vi, afterEach } from 'vitest';
import { POST as analise } from '@/app/api/analise/route';
import { GET as pdf } from '@/app/api/relatorios/[id]/pdf/route';
import { GET as preview } from '@/app/api/email/preview/route';
import { POST as solicitar } from '@/app/api/email/solicitar/route';
import { GET as status } from '@/app/api/status/route';
import { loadAnalystPrompt, OpenAICompatibleAnalyst, AnalystError } from '@/lib/analyst';

const post = (body: unknown) => new Request('http://x/api', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllEnvs());

describe('/api/analise', () => {
  it('demo: conversa completa gera id determinístico com etapas honestas', async () => {
    const res = await analise(post({ modo: 'demo', turnos: 21 }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.id).toBe('demo-sessao-21');
    expect(data.etapas.find((e: { id: string }) => e.id === 'analise').status).toBe('demonstrativa');
  });
  it('demo: conversa vazia é recusada (nada concluído artificialmente)', async () => {
    expect((await analise(post({ modo: 'demo', turnos: 0 }))).status).toBe(422);
  });
  it('real: sem analista configurado responde 503', async () => {
    vi.stubEnv('ANALYST_LLM_API_KEY', '');
    const res = await analise(post({ modo: 'real', transcricao: 'PESSOA: oi' }));
    expect(res.status).toBe(503);
    expect((await res.json()).id).toBeUndefined();
  });
  it('corpo inválido → 400', async () => {
    expect((await analise(post({ modo: 'x' }))).status).toBe(400);
  });
});

describe('outros endpoints', () => {
  it('PDF: 200 para demo, 404 para id desconhecido, 409 para apoio', async () => {
    const p = (id: string) => pdf(new Request('http://x'), { params: Promise.resolve({ id }) });
    const ok = await p('demo-dois');
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toBe('application/pdf');
    expect((await p('nao-existe')).status).toBe(404);
    expect((await p('demo-apoio')).status).toBe(409);
  });
  it('prévia do e-mail: só demo, identificada como demonstração', async () => {
    const ok = await preview(new Request('http://x/api/email/preview?id=demo-tres'));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toContain('Prévia de demonstração');
    expect((await preview(new Request('http://x/api/email/preview?id=AAAAAAAAAAAAAAAAAAAAAA'))).status).toBe(403);
  });
  it('solicitar código sem Resend configurado → 503', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const res = await solicitar(post({ reportId: 'demo-tres', email: 'a@b.com', consentimento: true }));
    expect(res.status).toBe(503);
  });
  it('status expõe apenas booleanos', async () => {
    const data = await (await status()).json();
    for (const v of Object.values(data)) expect(typeof v).toBe('boolean');
  });
});

describe('adaptador do analista', () => {
  it('lê o Prompt B original da documentação, sem alterá-lo', async () => {
    const p = await loadAnalystPrompt();
    expect(p.startsWith('Você é o analista do Mapa de Talentos.')).toBe(true);
    expect(p).toContain('# FORMATO DE SAÍDA');
  });
  it('envia a transcrição e devolve o JSON do modelo', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"nome":"A"}' } }] })));
    const a = new OpenAICompatibleAnalyst({ apiKey: 'k', baseUrl: 'https://llm.example/v1/', model: 'm', fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(await a.analisar('PESSOA: oi')).toEqual({ nome: 'A' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://llm.example/v1/chat/completions');
    expect(JSON.parse(String(init.body)).temperature).toBe(0.2);
  });
  it('resposta não-JSON vira erro de formato', async () => {
    const fetchImpl = async () => new Response(JSON.stringify({ choices: [{ message: { content: 'desculpe' } }] }));
    const a = new OpenAICompatibleAnalyst({ apiKey: 'k', baseUrl: 'https://x', model: 'm', fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(a.analisar('x')).rejects.toBeInstanceOf(AnalystError);
  });
});
