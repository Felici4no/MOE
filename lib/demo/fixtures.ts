/**
 * DADOS SINTÉTICOS DE DEMONSTRAÇÃO.
 * Nenhuma pessoa real. A conversa e a resposta do analista foram escritas à mão para
 * demonstrar o fluxo; a VALIDAÇÃO, porém, é a real (src/validar-relatorio.js).
 * Os documentos demo são reconstruídos de forma determinística a partir do id, sem estado.
 */
import { buildReportDocument, type ReportDocument } from '@/lib/domain/report';
import type { Autor } from '@/src/validar-relatorio.js';

export const DEMO_LABEL = 'Demonstração · dados sintéticos';
export const DEMO_DATE = '2026-11-22T12:00:00.000Z';
export const DEMO_PROJECT = 'Demonstração pública';
export const DEMO_CLIENT = 'Mercado Exemplo (fictício)';

export interface Turno { autor: Autor; texto: string }

export const DEMO_TURNOS: Turno[] = [
  { autor: 'LIA', texto: 'Oi, eu sou a Lia. Vou te fazer umas perguntas sobre o seu trabalho, coisas que você já viveu. Não é prova e não tem resposta certa. Posso começar?' },
  { autor: 'PESSOA', texto: 'Pode sim, pode começar.' },
  { autor: 'LIA', texto: 'Como você quer ser chamada? E o que você faz no trabalho?' },
  { autor: 'PESSOA', texto: 'Pode me chamar de Conceição. Sou operadora de caixa faz seis anos, no mercado do bairro.' },
  { autor: 'LIA', texto: 'Me conta uma vez em que você percebeu um erro antes de todo mundo.' },
  { autor: 'PESSOA', texto: 'Percebi que o preço do leite estava errado na gôndola e avisei o gerente antes de dar prejuízo.' },
  { autor: 'LIA', texto: 'Que olho, hein. E teve outra vez assim?' },
  { autor: 'PESSOA', texto: 'Toda noite eu confiro o fechamento duas vezes, e uma vez achei uma nota lançada em dobro.' },
  { autor: 'LIA', texto: 'Faz sentido. Me conta uma vez em que alguém estava chateado e você ajudou.' },
  { autor: 'PESSOA', texto: 'Uma cliente estava chorando porque o cartão foi recusado, eu fiquei com ela até resolver.' },
  { autor: 'LIA', texto: 'E como terminou?' },
  { autor: 'PESSOA', texto: 'Ela voltou na semana seguinte só para me agradecer. Uma colega nova também vivia nervosa, eu sentei com ela no intervalo e expliquei o sistema com calma.' },
  { autor: 'LIA', texto: 'Me conta o dia mais tenso que você já teve no trabalho.' },
  { autor: 'PESSOA', texto: 'No Natal o sistema caiu com a fila enorme e eu fui anotando tudo à mão, sem perder nenhuma venda.' },
  { autor: 'LIA', texto: 'Que situação. E você, o que fez depois?' },
  { autor: 'PESSOA', texto: 'Respirei, organizei a fila por ordem de chegada e conferi cada anotação quando o sistema voltou.' },
  { autor: 'LIA', texto: 'Se você pudesse passar o dia fazendo uma coisa no trabalho, o que seria?' },
  { autor: 'PESSOA', texto: 'Eu gosto de deixar o caixa redondinho, conferir tudo e ver os números batendo no fim do dia.' },
  { autor: 'LIA', texto: 'Qual parte do seu trabalho faz o tempo voar?' },
  { autor: 'PESSOA', texto: 'Quando chega gente nova e eu posso ensinar o jeito certo de fazer as coisas.' },
  { autor: 'LIA', texto: 'Conceição, uma coisa que me chamou atenção: você percebeu o preço errado do leite antes de todo mundo. E quando a cliente estava chorando, você ficou com ela até resolver. Obrigada por contar suas histórias. Terminamos nossa conversa. Seu Mapa de Talentos está sendo preparado.' },
];

/** Resposta SINTÉTICA do analista (Prompt B) para a conversa acima. */
export const DEMO_ANALISE = {
  nome: 'Conceição Araújo',
  funcao_atual: 'Operadora de caixa',
  talentos: [
    {
      tema: 'Olho Clínico', dominio: 'FAZER ACONTECER', confianca: 'Forte', pontos: 6,
      evidencias: [
        'Percebi que o preço do leite estava errado na gôndola e avisei o gerente antes de dar prejuízo.',
        'Toda noite eu confiro o fechamento duas vezes, e uma vez achei uma nota lançada em dobro.',
        'conferi cada anotação quando o sistema voltou.',
      ],
      frase: 'Você enxerga o erro antes de ele virar prejuízo.',
    },
    {
      tema: 'Porto Seguro', dominio: 'LIDAR COM GENTE', confianca: 'Forte', pontos: 4,
      evidencias: [
        'Uma cliente estava chorando porque o cartão foi recusado, eu fiquei com ela até resolver.',
        'eu sentei com ela no intervalo e expliquei o sistema com calma.',
      ],
      frase: 'Você percebe quando alguém precisa de apoio e fica até resolver.',
    },
    {
      tema: 'Sangue Frio', dominio: 'FORÇA INTERIOR', confianca: 'Moderado', pontos: 4,
      evidencias: [
        'No Natal o sistema caiu com a fila enorme e eu fui anotando tudo à mão, sem perder nenhuma venda.',
        'Respirei, organizei a fila por ordem de chegada',
      ],
      frase: 'Quando tudo aperta, você organiza e segue funcionando.',
    },
    {
      // Proposto pelo analista com uma única evidência: o validador descarta.
      tema: 'Palavra Dada', dominio: 'FAZER ACONTECER', confianca: 'Moderado', pontos: 2,
      evidencias: ['Toda noite eu confiro o fechamento duas vezes'],
      frase: 'Você leva até o fim.',
    },
  ],
  caminhos: [
    { caminho: 'Organizar e controlar', evidencia: 'Eu gosto de deixar o caixa redondinho, conferir tudo e ver os números batendo no fim do dia.' },
    { caminho: 'Cuidar e ensinar', evidencia: 'Quando chega gente nova e eu posso ensinar o jeito certo de fazer as coisas.' },
  ],
  trilhas_sugeridas: ['Prevenção de perdas', 'Treinamento de novos operadores'],
  em_descoberta: { tema: 'Voz Firme', convite: 'Quer me contar uma vez em que você tomou a frente de alguma situação?' },
  alerta_bem_estar: false,
  aviso: 'Este Mapa é uma ferramenta de autoconhecimento e desenvolvimento, não um teste psicológico. As decisões de carreira são suas e da sua liderança.',
};

const GENERICO_TRANSCRICAO = [
  'LIA: Me conta uma vez em que você assumiu uma coisa e levou até o fim.',
  'PESSOA: Ah, eu sou bem esforçado, sabe.',
  'LIA: E teve algum dia em que isso apareceu?',
  'PESSOA: Sou organizado, faço tudo direitinho.',
].join('\n');

export const turnosParaTranscricao = (turnos: Turno[]) => turnos.map(t => `${t.autor}: ${t.texto}`).join('\n');

/** Aliases editoriais → número de turnos da conversa demo (resultados verificados nos testes). */
export const DEMO_ALIASES: Record<string, { turnos: number; cliente: string | null; titulo: string }> = {
  'demo-tres': { turnos: DEMO_TURNOS.length, cliente: DEMO_CLIENT, titulo: 'Conversa completa · três talentos' },
  'demo-dois': { turnos: 14, cliente: DEMO_CLIENT, titulo: 'Conversa interrompida · dois talentos' },
  'demo-um': { turnos: 10, cliente: null, titulo: 'Conversa curta · um talento' },
  'demo-zero': { turnos: 6, cliente: null, titulo: 'Conversa muito curta · nenhum talento' },
};

export const DEMO_IDS = [...Object.keys(DEMO_ALIASES), 'demo-generico', 'demo-apoio'];

export function isDemoId(id: string) {
  return id.startsWith('demo-');
}

/** Reconstrói um documento demo a partir do id, ou null se o id não for válido. */
export function getDemoReport(id: string): ReportDocument | null {
  const base = { kind: 'demo' as const, projectName: DEMO_PROJECT, createdAt: DEMO_DATE };
  const alias = DEMO_ALIASES[id];
  const sessao = /^demo-sessao-(\d{1,2})$/.exec(id);
  if (alias || sessao) {
    const n = alias ? alias.turnos : Number(sessao![1]);
    if (n < 1 || n > DEMO_TURNOS.length) return null;
    return buildReportDocument({
      ...base, id, analise: structuredClone(DEMO_ANALISE),
      transcricao: turnosParaTranscricao(DEMO_TURNOS.slice(0, n)),
      clientName: alias ? alias.cliente : null,
    });
  }
  if (id === 'demo-generico') {
    return buildReportDocument({
      ...base, id, transcricao: GENERICO_TRANSCRICAO, clientName: null,
      analise: { ...structuredClone(DEMO_ANALISE), nome: 'Benedito Assunção', funcao_atual: 'Repositor' },
    });
  }
  if (id === 'demo-apoio') {
    return buildReportDocument({
      ...base, id, transcricao: turnosParaTranscricao(DEMO_TURNOS), clientName: null,
      analise: { ...structuredClone(DEMO_ANALISE), alerta_bem_estar: true },
    });
  }
  return null;
}
