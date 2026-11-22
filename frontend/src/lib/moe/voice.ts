/**
 * Rótulo do modo de conversa do MOE.
 *
 * - Cenários da empresa (`/moe?sessao=`): voz pela Agora Conversational AI quando o servidor tem
 *   AGORA_APP_ID/AGORA_APP_CERTIFICATE e PF_TOOLS_URL (ver useMoeVoice e backend/app/moe/voice.py);
 *   cada personagem fala com a voz do catálogo do servidor (`voice_id`) ou a voz padrão.
 * - Demonstração local (`/moe` sem parâmetros): roda só no navegador, sem servidor, por isso por texto.
 * IDs de voz nunca são inventados aqui: vêm do catálogo do backend (domain.voice_catalog).
 */
import type { MoeVoice } from "./useMoeVoice";

export const VOICE_STATUS = {
  label: "Por texto",
  detalhe: "Esta demonstração roda só no navegador. A conversa por voz fica nos cenários publicados pela empresa.",
};

export function voiceBadge(voz?: MoeVoice): { label: string; detalhe: string; on: boolean } {
  if (!voz) return { ...VOICE_STATUS, on: false };
  switch (voz.state) {
    case "live": return { label: "Por voz", detalhe: "Os personagens falam e ouvem pela Agora. Você pode voltar ao texto a qualquer momento.", on: true };
    case "connecting": return { label: "Ligando a voz…", detalhe: "Abrindo o microfone e chamando o personagem.", on: true };
    case "checking": return { label: "Verificando voz…", detalhe: "Conferindo se a voz está disponível neste servidor.", on: false };
    case "unavailable": return { label: "Por texto", detalhe: voz.reason || "A voz não está disponível agora.", on: false };
    default: return { label: "Por texto", detalhe: voz.reason || "Voz disponível: ative quando quiser.", on: false };
  }
}
