/**
 * Adaptador Agora — CONTRATO PREVISTO, AINDA NÃO LIGADO.
 *
 * Integração planejada (ver docs/frontend.md → "Integração Agora"):
 * 1. O backend gera token RTC (AGORA_APP_ID + AGORA_APP_CERTIFICATE) e inicia o agente
 *    conversacional com o Prompt A como system prompt (AGORA_CUSTOMER_ID/SECRET).
 * 2. O cliente entra no canal com agora-rtc-sdk-ng, publica o microfone e assina o áudio da Lia.
 * 3. Transcrições chegam por eventos com identificação do emissor; o encerramento é confirmado
 *    pelo estado da sessão no servidor, nunca apenas pela frase reconhecida pelo ASR.
 *
 * Enquanto isso não existir, start() falha de forma explícita e a interface oferece apenas
 * o modo demonstração. Nada aqui finge haver áudio ou conversa real.
 */
import type { VoiceEvents, VoiceProvider } from './types';

export class AgoraVoiceProvider implements VoiceProvider {
  readonly kind = 'agora' as const;
  readonly conversaComAudio = true;
  constructor(private events: VoiceEvents) {}
  async start() {
    const error = { code: 'nao_configurado' as const, message: 'A integração de voz com a Agora ainda não está disponível.', recuperavel: false };
    this.events.onError(error);
    throw error;
  }
  pause() {}
  resume() {}
  end() { this.events.onEnded('usuario'); }
  async setMicEnabled() {}
  getLevel() { return null; }
  getTranscript() { return []; }
  dispose() {}
}
