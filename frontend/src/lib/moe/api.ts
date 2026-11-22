/** Tipos da API do MOE (backend/app/moe). */
export type MoePoint = { id: string; name: string; description: string; signals: string[]; weight: number; in_use: boolean };
export type Stance = "colaborativa" | "direta" | "cetica" | "apressada" | "acolhedora";
export type Tone = "colaborativo" | "neutro" | "tenso";
export type VoiceTone = "serena" | "dinamica" | "objetiva" | "calorosa" | "firme";
export type MoePersona = {
  id: string; name: string; role: string; traits: string[]; speaking_style: string; stance: Stance;
  voice_tone: VoiceTone; voice_id: string; voice_verified: boolean; look: number; in_use: boolean;
};
export type MoeScene = { id: string; persona_id: string; line: string; point_ids: string[] };
export type MoeScenario = {
  id: string; title: string; description: string; pressure: number; tone: Tone; point_ids: string[]; scenes: MoeScene[];
  status: "draft" | "published"; version: number; published_at: string | null; dirty: boolean; cast_size: number;
};
export type MoeCatalog = {
  stances: Record<Stance, string>; tones: Record<Tone, string>; voice_tones: Record<VoiceTone, string>;
  pressure: Record<string, string>; looks: Record<string, string>; max_cast: number;
  voices: { vendor: string; voices: { id: string; label: string }[] };
};
export type PointReading = { point_id: string; name: string; weight: number; signals: string[]; quotes: string[]; note: string };
export type MoeAnalysis = { alert: boolean; method: "llm" | "mapeamento" | "none"; points: PointReading[]; notice: string };
export type CastMember = { id: string; name: string; role: string; look: number; voice_tone: VoiceTone; voice_id: string; traits: string[]; speaking_style: string; stance: Stance };
export type MoeSession = {
  id: string; status: "playing" | "finished"; version: number; title: string; description: string; pressure: number; tone: Tone;
  cast: CastMember[]; scenes: { id: string; persona_id: string; line: string; answered: boolean }[];
  answers: { scene_id: string; quote: string }[]; analysis: MoeAnalysis | null; wellbeing_alert: boolean; share_with_tenant: boolean;
};
export type SharedResult = { id: string; person: string; scenario: string; version: number; finished_at: string; analysis: MoeAnalysis; answers: { scene_id: string; quote: string }[] };
export type Available = { id: string; title: string; description: string; scenes: number; version: number };
