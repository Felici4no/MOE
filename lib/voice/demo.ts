/**
 * Provedor de DEMONSTRAÇÃO. Reproduz uma conversa sintética, em texto, com ritmo de fala.
 * Não há áudio da Lia nem reconhecimento de voz. O microfone, se ligado, serve apenas
 * para a visualização reagir ao seu nível de voz localmente.
 */
import { DEMO_TURNOS, type Turno } from '@/lib/demo/fixtures';
import { MicLevelMeter } from './microphone';
import type { TranscriptLine, VoiceEvents, VoiceProvider, VoiceError } from './types';

const MS_POR_PALAVRA = 170;
const PAUSA_ENTRE_TURNOS = 900;

export class DemoVoiceProvider implements VoiceProvider {
  readonly kind = 'demo' as const;
  readonly conversaComAudio = false;
  private lines: TranscriptLine[] = [];
  private turno = 0;
  private palavra = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private paused = false;
  private ended = false;
  private mic = new MicLevelMeter();

  constructor(private events: VoiceEvents, private turnos: Turno[] = DEMO_TURNOS, private speed = 1) {}

  async start() {
    this.events.onState('aguardando');
    this.schedule(600);
  }

  private schedule(ms: number) {
    this.clear();
    this.timer = setTimeout(() => this.tick(), ms / this.speed);
  }

  private clear() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private tick() {
    if (this.paused || this.ended) return;
    const atual = this.turnos[this.turno];
    if (!atual) return this.finish('encerramento_lia');
    const palavras = atual.texto.split(' ');
    if (this.palavra === 0) {
      this.events.onState(atual.autor === 'LIA' ? 'respondendo' : 'ouvindo');
      this.lines.push({ autor: atual.autor, texto: '', final: false });
    }
    this.palavra++;
    const linha = this.lines[this.lines.length - 1];
    linha.texto = palavras.slice(0, this.palavra).join(' ');
    if (this.palavra >= palavras.length) {
      linha.final = true;
      this.turno++;
      this.palavra = 0;
      this.emit();
      if (this.turno >= this.turnos.length) return this.finish('encerramento_lia');
      this.schedule(PAUSA_ENTRE_TURNOS);
      return;
    }
    this.emit();
    this.schedule(MS_POR_PALAVRA);
  }

  private emit() {
    this.events.onTranscript(this.lines.map(l => ({ ...l })));
  }

  private finish(reason: 'encerramento_lia' | 'usuario') {
    if (this.ended) return;
    this.ended = true;
    this.clear();
    // Fala interrompida não entra na transcrição analisada.
    this.lines = this.lines.filter(l => l.final);
    this.emit();
    this.mic.stop();
    this.events.onState('finalizada');
    this.events.onEnded(reason);
  }

  pause() {
    if (this.ended) return;
    this.paused = true;
    this.clear();
    this.events.onState('pausada');
  }

  resume() {
    if (this.ended || !this.paused) return;
    this.paused = false;
    const atual = this.turnos[this.turno];
    this.events.onState(atual?.autor === 'PESSOA' ? 'ouvindo' : 'respondendo');
    this.schedule(300);
  }

  end() { this.finish('usuario'); }

  async setMicEnabled(on: boolean) {
    if (!on) return this.mic.stop();
    try {
      await this.mic.start();
    } catch (e) {
      this.events.onError(e as VoiceError);
      throw e;
    }
  }

  getLevel() { return this.mic.level(); }

  getTranscript() { return this.lines.filter(l => l.final); }

  /** Quantos turnos completos foram reproduzidos (define o id demo-sessao-N). */
  get turnosCompletos() { return this.lines.filter(l => l.final).length; }

  dispose() {
    this.ended = true;
    this.clear();
    this.mic.stop();
  }
}
