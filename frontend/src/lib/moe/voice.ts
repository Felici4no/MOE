/**
 * Camada de voz do MOE (useMoeVoice) — estado desta sprint: SEM VOZ.
 *
 * A integração Agora existente (frontend/src/lib/useInterviewRoom.ts +
 * backend/app/services/agora.py) depende do backend FastAPI com AGORA_APP_ID,
 * AGORA_APP_CERTIFICATE, LLM e um fornecedor de TTS. Nenhuma dessas credenciais
 * está configurada, e o Preview Vercel hospeda apenas o frontend. Por isso o
 * modo disponível é texto, identificado como `DEMO SEM VOZ`.
 *
 * Perfis abstratos por personagem; IDs reais de voz NÃO são inventados aqui:
 * devem vir da configuração confirmada do fornecedor de TTS (backend `voice()`).
 */
import type { MoeNpc } from "@moe/protocol";

export type VoiceMode = "texto";

export const VOICE_PROFILES: Record<MoeNpc, { perfil: string; vozReal: null }> = {
  maia: { perfil: "serena", vozReal: null },
  leo: { perfil: "dinâmica", vozReal: null },
  nara: { perfil: "objetiva", vozReal: null },
};

export const VOICE_STATUS = {
  mode: "texto" as VoiceMode,
  label: "DEMO SEM VOZ",
  detalhe: "Voz por personagem ainda não integrada (Agora sem credenciais neste ambiente). Converse por texto.",
};
