import { describe, it, expect } from 'vitest';
import { inflateSync } from 'node:zlib';
import { renderReportPdf, pdfFilename } from '@/lib/pdf/ReportPdf';
import { getDemoReport } from '@/lib/demo/fixtures';
import { buildReportDocument } from '@/lib/domain/report';

/** Descompacta todos os streams FlateDecode do PDF (para inspecionar CMaps ToUnicode). */
function streams(pdf: Buffer): string {
  const out: string[] = [];
  const s = pdf.toString('latin1');
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length;
    const end = s.indexOf('endstream', start);
    try { out.push(inflateSync(pdf.subarray(start, end)).toString('latin1')); } catch { /* stream não comprimido */ }
  }
  return out.join('\n');
}

const pages = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

describe('PDF do relatório', () => {
  it('gera PDF A4 real a partir do objeto validado', async () => {
    const pdf = await renderReportPdf(getDemoReport('demo-tres')!);
    const s = pdf.toString('latin1');
    expect(s.startsWith('%PDF-')).toBe(true);
    expect(s).toMatch(/MediaBox \[0 0 595\.2\d+ 841\.8\d+\]/);
    expect(pages(pdf)).toBeGreaterThanOrEqual(4);
  });

  it('embute as fontes da identidade', async () => {
    const s = (await renderReportPdf(getDemoReport('demo-um')!)).toString('latin1');
    expect(s).toMatch(/SpaceGrotesk/);
    expect(s).toMatch(/InstrumentSans/);
    expect(s).toMatch(/IBMPlexMono/);
  });

  it('preserva acentuação (glifos mapeados para Unicode)', async () => {
    const doc = buildReportDocument({
      id: 'AAAAAAAAAAAAAAAAAAAAAA', kind: 'real', projectName: 'Ação Ênfase', clientName: 'Órgão Público de São João',
      participantName: 'Conceição Ávila Müller Gonçalves', createdAt: '2026-11-22T12:00:00Z',
      transcricao: 'PESSOA: Eu vi que o preço estava errado.\nPESSOA: Eu conferi o troco e avisei.',
      analise: { nome: 'x', alerta_bem_estar: false, talentos: [{ tema: 'Olho Clínico', dominio: 'FAZER ACONTECER', evidencias: ['Eu vi que o preço estava errado.', 'Eu conferi o troco e avisei.'] }] },
    });
    const txt = streams(await renderReportPdf(doc));
    // ç ã Á ü õ Ê Ó: presentes nos CMaps ToUnicode → texto extraível e correto.
    for (const cp of ['00e7', '00e3', '00c1', '00fc', '00f5', '00ca', '00d3']) {
      expect(txt.toLowerCase()).toContain(`<${cp}>`);
    }
  });

  it('gera documento com zero talentos sem quebrar', async () => {
    const pdf = await renderReportPdf(getDemoReport('demo-zero')!);
    expect(pdf.toString('latin1').startsWith('%PDF-')).toBe(true);
  });

  it('recusa documento sem conteúdo exibível (alerta de bem-estar)', async () => {
    await expect(renderReportPdf(getDemoReport('demo-apoio')!)).rejects.toThrow();
  });

  it('nome de arquivo sem acentos nem espaços', () => {
    expect(pdfFilename(getDemoReport('demo-tres')!)).toBe('mapa-de-talentos-conceicao-araujo.pdf');
  });
});
