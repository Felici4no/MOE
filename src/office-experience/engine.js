import { CENARIOS } from './scenarios.js';

const normalizar = (valor) => typeof valor === 'string' ? valor.trim() : '';
const copiar = (obj) => structuredClone(obj);

/** Um evento de participante é sempre distinguível de uma fala do NPC. */
export function iniciarSimulacao(cenarioId = 'entrega-sob-pressao') {
  const cenario = CENARIOS[cenarioId];
  if (!cenario) throw new Error('Cenário desconhecido');
  return {
    cenarioId,
    estado: 'em_andamento',
    indiceCena: 0,
    eventos: [],
  };
}

export function obterCena(sessao) {
  const cenario = CENARIOS[sessao?.cenarioId];
  if (!cenario) throw new Error('Sessão inválida');
  return sessao.estado === 'em_andamento' ? cenario.cenas[sessao.indiceCena] ?? null : null;
}

export function responder(sessao, texto) {
  if (!sessao || sessao.estado !== 'em_andamento') throw new Error('Sessão encerrada ou inválida');
  const fala = normalizar(texto);
  if (!fala || fala.length > 2000) throw new Error('Resposta inválida');
  const cena = obterCena(sessao);
  if (!cena) throw new Error('Cena inválida');
  const nova = copiar(sessao);
  nova.eventos.push({
    origem: 'office_simulation',
    scenario_id: sessao.cenarioId,
    scene_id: cena.id,
    speaker: 'participant',
    quote: fala,
    is_real_work_history: false,
  });
  nova.indiceCena++;
  if (nova.indiceCena >= CENARIOS[sessao.cenarioId].cenas.length) nova.estado = 'concluida';
  return nova;
}

export function encerrarSimulacao(sessao) {
  if (!sessao || !CENARIOS[sessao.cenarioId]) throw new Error('Sessão inválida');
  return { ...copiar(sessao), estado: 'encerrada' };
}

/** Não atribui talentos; apenas devolve o registro da experiência fictícia. */
export function criarResumo(sessao) {
  if (!sessao || !CENARIOS[sessao.cenarioId]) throw new Error('Sessão inválida');
  return {
    titulo: 'O que você experimentou na simulação',
    aviso: 'Estas respostas foram dadas em uma situação fictícia e não comprovam habilidades profissionais.',
    origem: 'office_simulation',
    respostas: sessao.eventos.filter(evento => evento.speaker === 'participant' && evento.is_real_work_history === false).map(evento => ({
      cena: evento.scene_id,
      citacao: evento.quote,
    })),
  };
}
