// Tipos para o validador existente (implementação em validar-relatorio.js, inalterada).
export type Autor = 'PESSOA' | 'LIA';
export interface Fala { autor: Autor; texto: string }
export interface TalentoValidado {
  tema: string;
  dominio: string;
  confianca: 'Forte' | 'Moderado';
  evidencias: string[];
  frase: string;
}
export interface CaminhoValidado { caminho: string; evidencia: string }
export interface RelatorioExibivel {
  nome: string;
  funcao_atual: string | null;
  talentos: TalentoValidado[];
  caminhos: CaminhoValidado[];
  trilhas_sugeridas: string[];
  em_descoberta: { tema: string; convite: string } | null;
  alerta_bem_estar: boolean;
  aviso: string;
}
export interface ResultadoValidacao {
  valido: boolean;
  compartilhamento_permitido: false;
  elegivel_para_compartilhamento: boolean;
  erros: string[];
  relatorio: RelatorioExibivel | null;
}
export function extrairFalas(transcricao: string): Fala[];
export function validarRelatorio(relatorio: unknown, transcricao: string): ResultadoValidacao;
