import type { Cena } from './engine.js';

export interface Personagem { id: 'maia' | 'leo' | 'nara'; nome: string; funcao: string; voiceProfile: string }
export interface Cenario { id: string; codigo: string; titulo: string; descricao: string; cenas: Cena[] }
export const PERSONAGENS: Readonly<Record<'maia' | 'leo' | 'nara', Personagem>>;
export const CENARIOS: Readonly<Record<string, Cenario>>;
