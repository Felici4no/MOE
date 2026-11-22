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
export type ScriptScene = { id: string; npc: string; fala: string; alternativas: string[] };
export type Script = {
  codigo: string; titulo: string; descricao: string; demo: boolean; pressao: number | null; clima: string | null;
  cast: ScriptPersona[]; cenas: ScriptScene[];
};

const S01 = CENARIOS["entrega-sob-pressao"];
const DEMO_LOOKS: Record<string, number> = { maia: 1, leo: 2, nara: 3 };

export function demoScript(): Script {
  const keys = [...new Set(S01.cenas.map((c) => c.npcId))] as (keyof typeof PERSONAGENS)[];
  return {
    codigo: S01.codigo, titulo: S01.titulo, descricao: S01.descricao, demo: true, pressao: null, clima: null,
    cast: keys.map((k) => ({
      key: k, nome: PERSONAGENS[k].nome, papel: PERSONAGENS[k].funcao, look: DEMO_LOOKS[k] ?? 1,
      traits: [], estilo: "", postura: null, tomDeVoz: null, voiceId: null,
    })),
    cenas: S01.cenas.map((c) => ({ id: c.id, npc: c.npcId, fala: c.fala, alternativas: c.alternativas })),
  };
}

export function sessionScript(s: MoeSession): Script {
  return {
    codigo: `v${s.version}`, titulo: s.title, descricao: s.description, demo: false, pressao: s.pressure, clima: s.tone,
    cast: s.cast.map((p) => ({
      key: p.id, nome: p.name, papel: p.role, look: p.look, traits: p.traits, estilo: p.speaking_style,
      postura: p.stance, tomDeVoz: p.voice_tone, voiceId: p.voice_id || null,
    })),
    cenas: s.scenes.map((c) => ({ id: c.id, npc: c.persona_id, fala: c.line, alternativas: [] })),
  };
}

export const POSTURA: Record<Stance, string> = {
  colaborativa: "colaborativa", direta: "direta", cetica: "cética", apressada: "apressada", acolhedora: "acolhedora",
};
export const TOM: Record<VoiceTone, string> = {
  serena: "serena", dinamica: "dinâmica", objetiva: "objetiva", calorosa: "calorosa", firme: "firme",
};
