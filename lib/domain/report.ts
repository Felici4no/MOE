/**
 * Modelo do documento exibido (web, PDF, e-mail). Ele SEMPRE nasce da saída de
 * validarRelatorio(); a resposta bruta do analista nunca chega à interface.
 * A transcrição não é guardada no documento: apenas contagens e o relatório validado.
 */
import { validarRelatorio, extrairFalas } from '@/src/validar-relatorio.js';
import type { RelatorioExibivel } from '@/src/validar-relatorio.js';
import { AVISO_DECISAO } from './catalogo';

export type { RelatorioExibivel, TalentoValidado, CaminhoValidado } from '@/src/validar-relatorio.js';

export type ReportKind = 'demo' | 'real';

export interface ReportDocument {
  id: string;
  kind: ReportKind;
  participantName: string;
  projectName: string;
  clientName: string | null;
  createdAt: string;
  /** 'apoio' quando há alerta de bem-estar: nenhum conteúdo do relatório é exibido. */
  status: 'ok' | 'apoio';
  relatorio: RelatorioExibivel | null;
  /** Número de falas da pessoa (não o conteúdo). */
  falasDaPessoa: number;
  /** Temas e caminhos propostos pelo analista e descartados pelo validador. */
  descartes: number;
}

export interface BuildInput {
  id: string;
  kind: ReportKind;
  analise: unknown;
  transcricao: string;
  projectName: string;
  clientName?: string | null;
  participantName?: string | null;
  createdAt: string;
}

const limpar = (v: string | null | undefined, max = 120) => {
  const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
  return s || null;
};

export function buildReportDocument(input: BuildInput): ReportDocument {
  const resultado = validarRelatorio(input.analise, input.transcricao);
  const falas = extrairFalas(input.transcricao).filter(f => f.autor === 'PESSOA').length;
  const nome = limpar(input.participantName) ?? limpar(resultado.relatorio?.nome) ?? 'Participante';
  const apoio = resultado.relatorio === null;
  return {
    id: input.id,
    kind: input.kind,
    participantName: nome,
    projectName: limpar(input.projectName) ?? 'Mapa de Talentos',
    // Nunca inventar cliente: ausente continua ausente.
    clientName: limpar(input.clientName),
    createdAt: input.createdAt,
    status: apoio ? 'apoio' : 'ok',
    relatorio: resultado.relatorio,
    falasDaPessoa: falas,
    // Conta apenas temas e caminhos propostos que o validador removeu (não cada mensagem de erro).
    descartes: resultado.erros.filter(e => /^(Tema descartado|Tema\/domínio|Citação de caminho)/.test(e)).length,
  };
}

/** Introdução determinística, construída apenas a partir do que foi validado. */
export function buildIntro(doc: ReportDocument): string[] {
  const r = doc.relatorio;
  if (!r) return [];
  const primeiroNome = doc.participantName.split(' ')[0];
  const funcao = r.funcao_atual ? ` Você contou sobre o seu trabalho como ${r.funcao_atual.toLowerCase()}.` : '';
  const relatos = doc.falasDaPessoa === 1 ? '1 fala' : `${doc.falasDaPessoa} falas`;
  const n = r.talentos.length;
  const abertura = `${primeiroNome}, este documento reúne o que apareceu nas ${relatos} que você compartilhou com a Lia.${funcao}`;
  if (n === 0) {
    return [
      abertura,
      'Desta vez, nenhum tema apareceu em pelo menos duas histórias diferentes. Isso não diz nada sobre o que você sabe fazer: significa apenas que o mapa ainda precisa de mais histórias concretas.',
      'Nada aqui foi completado por suposição. O que não teve evidência suficiente ficou de fora.',
    ];
  }
  const talentos = n === 1 ? 'um talento apareceu' : `${n} talentos apareceram`;
  return [
    abertura,
    `Nelas, ${talentos} com pelo menos duas evidências literais, tiradas de falas diferentes suas. Cada citação deste documento foi conferida contra a transcrição da conversa.`,
    n < 3
      ? 'O mapa mostra só o que as histórias sustentam. Por isso ele tem menos de três talentos — e isso é parte do método, não uma falha sua.'
      : 'Leia as citações com calma: elas são suas palavras, e é nelas que o mapa se apoia.',
  ];
}

export const AVISO_DOCUMENTO = AVISO_DECISAO;

export function formatarData(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(d);
}

/** Código curto exibível do documento (não é o identificador de acesso completo). */
export function codigoDocumento(id: string): string {
  return id.startsWith('demo-') ? id.toUpperCase() : `MT-${id.slice(0, 8).toUpperCase()}`;
}
