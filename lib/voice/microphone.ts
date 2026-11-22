/**
 * Medidor local de nível do microfone. O áudio NÃO é gravado nem enviado:
 * apenas a amplitude é lida para a visualização AsciiWave.
 */
import type { VoiceError } from './types';

export class MicLevelMeter {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private buf: Uint8Array<ArrayBuffer> | null = null;
  private smooth = 0;

  get active() { return this.stream !== null; }

  async start(): Promise<void> {
    if (this.stream) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw { code: 'microfone_indisponivel', message: 'Este navegador não oferece acesso ao microfone.', recuperavel: false } satisfies VoiceError;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      const negado = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      throw {
        code: negado ? 'microfone_negado' : 'microfone_indisponivel',
        message: negado
          ? 'O acesso ao microfone foi negado. Você pode liberar nas permissões do navegador e tentar de novo.'
          : 'Não encontramos um microfone disponível.',
        recuperavel: true,
      } satisfies VoiceError;
    }
    this.ctx = new AudioContext();
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.buf = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
    source.connect(this.analyser);
  }

  level(): number | null {
    if (!this.analyser || !this.buf) return null;
    this.analyser.getByteTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) {
      const v = (this.buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.buf.length);
    this.smooth = this.smooth * 0.8 + Math.min(1, rms * 4) * 0.2;
    return this.smooth;
  }

  stop() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.analyser = null;
    void this.ctx?.close();
    this.ctx = null;
    this.smooth = 0;
  }
}
