// Tipos para o motor de cenários (implementação em engine.js).
export interface EventoParticipante {
  origem: 'office_simulation';
  scenario_id: string;
  scene_id: string;
  speaker: 'participant';
  quote: string;
  is_real_work_history: false;
}
export interface Sessao {
  cenarioId: string;
  estado: 'em_andamento' | 'concluida' | 'encerrada';
  indiceCena: number;
  eventos: EventoParticipante[];
}
export interface Cena {
  id: string;
  npcId: 'maia' | 'leo' | 'nara';
  fala: string;
  alternativas: string[];
}
export interface Resumo {
  titulo: string;
  aviso: string;
  origem: 'office_simulation';
  respostas: { cena: string; citacao: string }[];
}
export function iniciarSimulacao(cenarioId?: string): Sessao;
export function obterCena(sessao: Sessao): Cena | null;
export function obterFase(sessao: Sessao): string;
export function responder(sessao: Sessao, texto: string): Sessao;
export function encerrarSimulacao(sessao: Sessao): Sessao;
export function criarResumo(sessao: Sessao): Resumo;
