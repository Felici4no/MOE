/**
 * Roteiro jogável pelo escritório: vem do S01 local (demonstração) ou de um cenário
 * publicado pela empresa (sessão na API). A tela não precisa saber a origem.
 */
import { CENARIOS, PERSONAGENS } from "@moe/scenarios";
import type { MoeSession, Stance, VoiceTone } from "./api";

export type ScriptPersona = {
  key: string; nome: string; papel: string; look: number;
  traits: string[]; estilo: string; postura: Stance | null; tomDeVoz: VoiceTone | null; voiceId: string | null;
};
export type ScriptScene = {
  id: string; turn: number; npc: string; fala: string; alternativas: string[];
  etapa: string; origem: "roteiro" | "memoria" | "mente" | "modelo";
};
export type Script = {
  codigo: string; titulo: string; descricao: string; demo: boolean; pressao: number | null; clima: string | null;
  vaga: string | null; cast: ScriptPersona[];
  /** Falas dos personagens conhecidas até agora (a conversa cresce a cada resposta). */
  cenas: ScriptScene[];
  total: number;
  etapas: string[];
  /** Etapa de cada personagem (chave do elenco → etapa), para agrupar o elenco por nível. */
  etapaDe: Record<string, string>;
};

const S01 = CENARIOS["entrega-sob-pressao"];
const DEMO_LOOKS: Record<string, number> = { maia: 1, leo: 2, nara: 3 };

export function demoScript(): Script {
  const keys = [...new Set(S01.cenas.map((c) => c.npcId))] as (keyof typeof PERSONAGENS)[];
  return {
    codigo: S01.codigo, titulo: S01.titulo, descricao: S01.descricao, demo: true, pressao: null, clima: null, vaga: null,
    cast: keys.map((k) => ({
      key: k, nome: PERSONAGENS[k].nome, papel: PERSONAGENS[k].funcao, look: DEMO_LOOKS[k] ?? 1,
      traits: [], estilo: "", postura: null, tomDeVoz: null, voiceId: null,
    })),
    cenas: S01.cenas.map((c) => ({ id: c.id, turn: 0, npc: c.npcId, fala: c.fala, alternativas: c.alternativas, etapa: "", origem: "roteiro" as const })),
    total: S01.cenas.length,
    etapas: [],
    etapaDe: {},
  };
}

export function sessionScript(s: MoeSession): Script {
  return {
    codigo: `v${s.version}`, titulo: s.title, descricao: s.description, demo: false, pressao: s.pressure, clima: s.tone,
    vaga: s.job_title,
    cast: s.cast.map((p) => ({
      key: p.id, nome: p.name, papel: p.role, look: p.look, traits: p.traits, estilo: p.speaking_style,
      postura: p.stance, tomDeVoz: p.voice_tone, voiceId: p.voice_id || null,
    })),
    cenas: (s.turns?.length ? s.turns : s.scenes.map((c) => ({ scene_id: c.id, turn: 0, persona_id: c.persona_id, line: c.line, source: "roteiro" as const })))
      .map((t) => ({ id: t.scene_id, turn: t.turn, npc: t.persona_id, fala: t.line, alternativas: [],
        etapa: s.scenes.find((c) => c.id === t.scene_id)?.stage ?? "", origem: t.source })),
    total: s.total_turns ?? s.scenes.length,
    etapas: [...new Set(s.scenes.map((c) => c.stage).filter(Boolean))],
    etapaDe: Object.fromEntries(s.scenes.filter((c) => c.stage).map((c) => [c.persona_id, c.stage])),
  };
}

export const POSTURA: Record<Stance, string> = {
  colaborativa: "colaborativa", direta: "direta", cetica: "cética", apressada: "apressada", acolhedora: "acolhedora",
};
export const TOM: Record<VoiceTone, string> = {
  serena: "serena", dinamica: "dinâmica", objetiva: "objetiva", calorosa: "calorosa", firme: "firme",
};
