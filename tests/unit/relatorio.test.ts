import { describe, it, expect } from 'vitest';
import { getDemoReport, DEMO_TURNOS, DEMO_IDS, DEMO_ALIASES } from '@/lib/demo/fixtures';
import { buildReportDocument, buildIntro } from '@/lib/domain/report';
import { extrairFalas } from '@/src/validar-relatorio.js';

const falasDaPessoa = DEMO_TURNOS.filter(t => t.autor === 'PESSOA').map(t => t.texto);

describe('documentos de demonstração (validador real)', () => {
  it.each([
    ['demo-tres', 3, 2],
    ['demo-dois', 2, 0],
    ['demo-um', 1, 0],
    ['demo-zero', 0, 0],
  ])('%s exibe %i talentos e %i caminhos, sem completar artificialmente', (id, talentos, caminhos) => {
    const doc = getDemoReport(id)!;
    expect(doc.kind).toBe('demo');
    expect(doc.relatorio!.talentos).toHaveLength(talentos);
    expect(doc.relatorio!.caminhos).toHaveLength(caminhos);
  });

  it('toda evidência exibida é literal e vem de falas da PESSOA (nunca da Lia)', () => {
    for (const id of Object.keys(DEMO_ALIASES)) {
      const doc = getDemoReport(id)!;
      for (const t of doc.relatorio!.talentos) {
        expect(t.evidencias.length).toBeGreaterThanOrEqual(2);
        for (const e of t.evidencias) expect(falasDaPessoa.some(f => f.includes(e))).toBe(true);
      }
    }
  });

  it('confiança vem da contagem do validador, não do analista', () => {
    const doc = getDemoReport('demo-tres')!;
    const porTema = Object.fromEntries(doc.relatorio!.talentos.map(t => [t.tema, t.confianca]));
    // O analista sintético marcou Porto Seguro como "Forte" com 2 evidências: o validador corrige.
    expect(porTema['Porto Seguro']).toBe('Moderado');
    expect(porTema['Olho Clínico']).toBe('Forte');
  });

  it('descarta o tema proposto com uma evidência só e informa a contagem', () => {
    const doc = getDemoReport('demo-tres')!;
    expect(doc.relatorio!.talentos.map(t => t.tema)).not.toContain('Palavra Dada');
    expect(doc.descartes).toBe(1);
  });

  it('respostas genéricas não geram talentos', () => {
    const doc = getDemoReport('demo-generico')!;
    expect(doc.relatorio!.talentos).toHaveLength(0);
    expect(doc.relatorio!.caminhos).toHaveLength(0);
  });

  it('alerta de bem-estar oculta todo o conteúdo', () => {
    const doc = getDemoReport('demo-apoio')!;
    expect(doc.status).toBe('apoio');
    expect(doc.relatorio).toBeNull();
  });

  it('sessões demo reconstróem pelo número de turnos e rejeitam ids inválidos', () => {
    expect(getDemoReport(`demo-sessao-${DEMO_TURNOS.length}`)!.relatorio!.talentos).toHaveLength(3);
    expect(getDemoReport('demo-sessao-0')).toBeNull();
    expect(getDemoReport('demo-sessao-99')).toBeNull();
    expect(getDemoReport('demo-inexistente')).toBeNull();
    for (const id of DEMO_IDS) expect(getDemoReport(id)).not.toBeNull();
  });

  it('a transcrição sintética está bem rotulada', () => {
    const t = DEMO_TURNOS.map(x => `${x.autor}: ${x.texto}`).join('\n');
    expect(extrairFalas(t)).toHaveLength(DEMO_TURNOS.length);
  });
});

describe('modelo do documento', () => {
  const base = {
    id: 'AAAAAAAAAAAAAAAAAAAAAA', kind: 'real' as const, projectName: 'Piloto', createdAt: '2026-11-22T12:00:00Z',
    transcricao: 'LIA: Oi\nPESSOA: Eu vi que o preço estava errado.\nLIA: E?\nPESSOA: Eu conferi o troco e avisei.',
    analise: {
      nome: 'Ana', funcao_atual: null, alerta_bem_estar: false, caminhos: [], em_descoberta: null,
      talentos: [{ tema: 'Olho Clínico', dominio: 'FAZER ACONTECER', evidencias: ['Eu vi que o preço estava errado.', 'Eu conferi o troco e avisei.'], frase: 'x' }],
    },
  };

  it('não inventa cliente quando ausente', () => {
    expect(buildReportDocument({ ...base, clientName: '' }).clientName).toBeNull();
    expect(buildReportDocument({ ...base, clientName: undefined }).clientName).toBeNull();
    expect(buildReportDocument({ ...base, clientName: '  Loja X  ' }).clientName).toBe('Loja X');
  });

  it('mantém projeto, cliente e pessoa como campos distintos', () => {
    const doc = buildReportDocument({ ...base, clientName: 'Loja X', participantName: 'Ana Lúcia' });
    expect([doc.projectName, doc.clientName, doc.participantName]).toEqual(['Piloto', 'Loja X', 'Ana Lúcia']);
  });

  it('não guarda a transcrição no documento', () => {
    const doc = buildReportDocument(base);
    expect(JSON.stringify(doc)).not.toContain('LIA:');
    expect(doc.falasDaPessoa).toBe(2);
  });

  it('introdução parcial não promete talentos que não existem', () => {
    const zero = buildIntro(getDemoReport('demo-zero')!).join(' ');
    expect(zero).toMatch(/nenhum tema/i);
    const um = buildIntro(getDemoReport('demo-um')!).join(' ');
    expect(um).toMatch(/um talento apareceu/);
    expect(um).toMatch(/menos de três/);
  });

  it('sem nenhuma evidência válida o documento continua exibível e vazio', () => {
    const doc = buildReportDocument({ ...base, transcricao: 'LIA: Oi\nPESSOA: Sou esforçada.' });
    expect(doc.relatorio!.talentos).toEqual([]);
    expect(doc.status).toBe('ok');
  });
});
