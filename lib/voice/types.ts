/**
 * Contrato da camada de voz. A interface de entrevista só conhece este contrato;
 * provedores (Demo, Agora) são intercambiáveis.
 */
export type SessionState = 'aguardando' | 'ouvindo' | 'respondendo' | 'pausada' | 'finalizada' | 'reconectando' | 'erro';

export interface TranscriptLine {
  autor: 'LIA' | 'PESSOA';
  texto: string;
  /** false enquanto a fala ainda está em andamento (legenda parcial). */
  final: boolean;
}

export interface VoiceError {
  code: 'microfone_negado' | 'microfone_indisponivel' | 'conexao' | 'nao_configurado';
  message: string;
  recuperavel: boolean;
}

export type EndReason = 'encerramento_lia' | 'usuario';

export interface VoiceEvents {
  onState(state: SessionState): void;
  onTranscript(lines: TranscriptLine[]): void;
  onError(error: VoiceError): void;
  onEnded(reason: EndReason): void;
}

export interface VoiceProvider {
  readonly kind: 'demo' | 'agora';
  /** true somente se há áudio real da conversa (não apenas teste de microfone). */
  readonly conversaComAudio: boolean;
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  end(): void;
  setMicEnabled(on: boolean): Promise<void>;
  /** Nível de áudio 0..1 do microfone local, ou null se não houver áudio. */
  getLevel(): number | null;
  /** Transcrição rotulada PESSOA:/LIA: para o analista. */
  getTranscript(): TranscriptLine[];
  dispose(): void;
}
