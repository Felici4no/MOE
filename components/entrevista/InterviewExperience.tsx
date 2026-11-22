'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Mic, MicOff, Pause, Play, Square, Captions, CaptionsOff } from 'lucide-react';
import { AsciiWave } from '@/components/ascii';
import { DemoVoiceProvider } from '@/lib/voice/demo';
import { AgoraVoiceProvider } from '@/lib/voice/agora';
import type { SessionState, TranscriptLine, VoiceError, VoiceProvider } from '@/lib/voice/types';
import { ProcessingView, type ProcessingPayload } from './ProcessingView';

const STATE_LABEL: Record<SessionState, string> = {
  aguardando: 'Aguardando', ouvindo: 'Ouvindo', respondendo: 'Lia está falando', pausada: 'Pausada',
  finalizada: 'Finalizada', reconectando: 'Reconectando', erro: 'Erro',
};

type Stage = 'consentimento' | 'sessao' | 'processando';

export function InterviewExperience({ vozReal, speed = 1 }: { vozReal: boolean; speed?: number }) {
  const [stage, setStage] = useState<Stage>('consentimento');
  const [payload, setPayload] = useState<ProcessingPayload | null>(null);

  if (stage === 'processando' && payload) {
    return <ProcessingView payload={payload} onBack={() => setStage('consentimento')} />;
  }
  if (stage === 'sessao') {
    return (
      <Session
        vozReal={vozReal}
        speed={speed}
        onFinish={p => { setPayload(p); setStage('processando'); }}
        onAbort={() => setStage('consentimento')}
      />
    );
  }
  return <Consent vozReal={vozReal} onStart={() => setStage('sessao')} />;
}

/* ------------------------------------------------------------------------- */

function Consent({ vozReal, onStart }: { vozReal: boolean; onStart: () => void }) {
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState(false);
  const id = useId();
  return (
    <main id="conteudo" className="shell py-[clamp(32px,6vw,80px)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-3">
        <Link href="/" className="meta no-underline hover:underline">← Mapa de Talentos</Link>
        {!vozReal && <span className="tag tag-demo">Modo demonstração</span>}
      </div>
      <div className="grid-12 mt-12 gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-6">
          <p className="meta meta-soft">Entrevista · Lia</p>
          <h1 className="display-xl mt-4">Antes de começar</h1>
          <ul className="mt-8 space-y-4 text-lg">
            <li className="flex gap-4"><span className="meta pt-1.5">01</span>A Lia vai pedir situações reais do seu trabalho. Uma pergunta por vez, sem nota e sem resposta certa.</li>
            <li className="flex gap-4"><span className="meta pt-1.5">02</span>A conversa leva cerca de dez minutos. Você pode pausar ou encerrar quando quiser.</li>
            <li className="flex gap-4"><span className="meta pt-1.5">03</span>No fim, você recebe um documento privado. Nada é enviado a nenhuma empresa sem uma autorização sua, separada.</li>
          </ul>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-8">
          {!vozReal && (
            <div className="border-2 border-dashed border-ink bg-surface p-5">
              <p className="meta">Como funciona esta demonstração</p>
              <p className="mt-3">
                A integração de voz ainda não está ativa neste ambiente. Você vai acompanhar uma <strong>conversa sintética, em texto</strong>, entre a Lia e uma pessoa fictícia. Não há áudio da Lia e nada do que você disser é gravado ou enviado.
              </p>
              <p className="small mt-3 text-ink-soft">
                O microfone é opcional: se você ligar, a visualização reage ao volume da sua voz, só no seu aparelho. A análise usa uma resposta demonstrativa; a validação das citações é a real.
              </p>
            </div>
          )}
          <form
            className="mt-8"
            onSubmit={e => { e.preventDefault(); if (!ok) { setErro(true); return; } onStart(); }}
            noValidate
          >
            <div className="flex items-start gap-3">
              <input id={id} type="checkbox" className="check" checked={ok} onChange={e => { setOk(e.target.checked); setErro(false); }} aria-invalid={erro} aria-describedby={erro ? `${id}-err` : undefined} />
              <label htmlFor={id}>
                {vozReal ? 'Li as informações acima e concordo em participar da conversa.' : 'Entendi que esta é uma demonstração com dados sintéticos e quero continuar.'}
              </label>
            </div>
            {erro && <p id={`${id}-err`} role="alert" className="field-error">Para começar, marque a confirmação acima.</p>}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button type="submit" className="btn btn-primary">{vozReal ? 'Começar conversa' : 'Começar demonstração'}</button>
              <Link href="/privacidade" className="small">Como tratamos seus dados</Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------------- */

function Session({ vozReal, speed, onFinish, onAbort }: {
  vozReal: boolean; speed: number;
  onFinish: (p: ProcessingPayload) => void; onAbort: () => void;
}) {
  const [state, setState] = useState<SessionState>('aguardando');
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [micOn, setMicOn] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [error, setError] = useState<VoiceError | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const providerRef = useRef<VoiceProvider | null>(null);
  const finishedRef = useRef(false);
  const transcriptId = useId();
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; });

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const p = providerRef.current;
    if (!p) return;
    const final = p.getTranscript();
    const falas = final.filter(l => l.autor === 'PESSOA').length;
    setTimeout(() => {
      onFinishRef.current(p.kind === 'demo'
        ? { modo: 'demo', turnos: final.length, falas }
        : { modo: 'real', transcricao: final.map(l => `${l.autor}: ${l.texto}`).join('\n'), falas });
    }, 900);
  }, []);

  useEffect(() => {
    const events = {
      onState: setState,
      onTranscript: setLines,
      onError: (e: VoiceError) => setError(e),
      onEnded: () => finish(),
    };
    const p: VoiceProvider = vozReal ? new AgoraVoiceProvider(events) : new DemoVoiceProvider(events, undefined, speed);
    providerRef.current = p;
    p.start().catch(() => setState('erro'));
    return () => p.dispose();
  }, [vozReal, speed, finish]);

  const toggleMic = async () => {
    const p = providerRef.current;
    if (!p) return;
    setMicBusy(true);
    try {
      await p.setMicEnabled(!micOn);
      setMicOn(!micOn);
      if (error?.code.startsWith('microfone')) setError(null);
    } catch { /* erro já reportado via onError */ }
    setMicBusy(false);
  };

  const readLevel = useCallback(() => providerRef.current?.getLevel() ?? null, []);
  const current = lines[lines.length - 1];
  const lastFinal = useMemo(() => [...lines].reverse().find(l => l.final), [lines]);
  const paused = state === 'pausada';
  const ended = state === 'finalizada';
  const fatal = error && !error.recuperavel;

  const waveMode = paused ? 'paused' : state === 'respondendo' ? 'speaking' : state === 'ouvindo' ? 'listening' : 'idle';

  return (
    <main id="conteudo" className="flex min-h-dvh flex-col bg-paper">
      {/* Barra superior: identificação, estado, consentimento */}
      <header className="border-b-2 border-ink">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="grid h-9 w-9 place-items-center border-2 border-ink bg-signal font-mono text-sm font-medium text-on-signal">Li</span>
            <div>
              <p className="font-display font-bold leading-none">Lia</p>
              <p className="meta meta-soft">Entrevistadora de IA</p>
            </div>
          </div>
          <p className="tag" role="status" aria-live="polite">
            <span className={`dot ${state === 'ouvindo' || state === 'respondendo' ? 'blink' : ''}`} aria-hidden="true" />
            {STATE_LABEL[state]}
          </p>
          <div className="flex items-center gap-3">
            {!vozReal && <span className="tag tag-demo">Demonstração · sintético</span>}
            <Link href="/privacidade" target="_blank" className="meta hidden sm:inline">Privacidade</Link>
          </div>
        </div>
      </header>

      <div className="shell flex flex-1 flex-col py-6">
        <p className="meta meta-soft">
          Consentimento registrado nesta sessão · {vozReal ? 'você pode parar quando quiser' : 'nada é gravado ou enviado'}
        </p>

        {/* Visualização */}
        <div className="relative mt-4 h-[26vh] min-h-[160px] border-y-2 border-ink md:h-[32vh]">
          <AsciiWave className="absolute inset-0" mode={waveMode} readLevel={micOn ? readLevel : undefined} />
          {!micOn && !vozReal && (
            <p className="meta absolute bottom-2 right-2 bg-paper px-2 py-1">Sem áudio nesta demonstração</p>
          )}
        </div>

        {/* Legenda principal */}
        <section aria-label="Legenda" className="mx-auto mt-8 w-full max-w-[920px] flex-1">
          {error && (
            <div role="alert" className="mb-6 border-2 border-[var(--error-text)] bg-surface p-4">
              <p className="font-display font-bold text-[var(--error-text)]">{fatal ? 'Não foi possível iniciar a conversa.' : 'Atenção'}</p>
              <p className="mt-1">{error.message}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {fatal ? (
                  <button type="button" className="btn btn-sm" onClick={onAbort}>Voltar</button>
                ) : (
                  <button type="button" className="btn btn-sm" onClick={() => setError(null)}>Entendi</button>
                )}
              </div>
            </div>
          )}
          {current ? (
            <div>
              <p className="meta">{current.autor === 'LIA' ? 'Lia' : vozReal ? 'Você' : 'Pessoa (sintética)'}</p>
              <p className={`mt-3 font-display text-[clamp(1.4rem,3.2vw,2.6rem)] font-medium leading-[1.15] tracking-tight ${current.autor === 'PESSOA' ? 'text-ink-soft' : ''}`}>
                {current.texto}{!current.final && <span className="blink" aria-hidden="true">▍</span>}
              </p>
            </div>
          ) : (
            !fatal && <p className="display-m text-ink-soft">A Lia vai começar em instantes…</p>
          )}
          {/* Leitor de tela: apenas falas completas, sem ruído palavra a palavra */}
          <p className="sr-only" aria-live="polite">{lastFinal ? `${lastFinal.autor === 'LIA' ? 'Lia' : 'Pessoa'}: ${lastFinal.texto}` : ''}</p>

          {showTranscript && (
            <ol id={transcriptId} className="mt-10 border-t-2 border-ink" aria-label="Transcrição">
              {lines.filter(l => l.final).map((l, i) => (
                <li key={i} className="grid grid-cols-[88px_1fr] gap-4 border-b border-ink py-3">
                  <span className="meta pt-1">{String(i + 1).padStart(2, '0')} {l.autor === 'LIA' ? 'Lia' : 'Pessoa'}</span>
                  <span className={l.autor === 'PESSOA' ? '' : 'text-ink-soft'}>{l.texto}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Controles */}
      <nav aria-label="Controles da conversa" className="sticky bottom-0 border-t-2 border-ink bg-paper">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-4">
          {confirmEnd ? (
            <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Confirmar encerramento">
              <p className="font-medium">Encerrar agora? Só o que já foi dito será analisado.</p>
              <button type="button" className="btn btn-danger btn-sm" autoFocus onClick={() => { setConfirmEnd(false); providerRef.current?.end(); }}>
                <Square size={16} aria-hidden="true" /> Sim, encerrar
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setConfirmEnd(false)}>Continuar conversa</button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn btn-sm" onClick={toggleMic} disabled={micBusy || ended || !!fatal} aria-pressed={micOn}>
                  {micOn ? <Mic size={18} aria-hidden="true" /> : <MicOff size={18} aria-hidden="true" />}
                  {micOn ? 'Microfone ligado' : vozReal ? 'Ativar microfone' : 'Testar microfone'}
                </button>
                <button type="button" className="btn btn-sm" disabled={ended || !!fatal} onClick={() => (paused ? providerRef.current?.resume() : providerRef.current?.pause())}>
                  {paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
                  {paused ? 'Continuar' : 'Pausar'}
                </button>
                <button type="button" className="btn btn-sm btn-ghost" aria-expanded={showTranscript} aria-controls={transcriptId} onClick={() => setShowTranscript(s => !s)}>
                  {showTranscript ? <CaptionsOff size={18} aria-hidden="true" /> : <Captions size={18} aria-hidden="true" />}
                  {showTranscript ? 'Ocultar transcrição' : 'Mostrar transcrição'}
                </button>
              </div>
              <button type="button" className="btn btn-danger btn-sm" disabled={ended || !!fatal} onClick={() => setConfirmEnd(true)}>
                <Square size={16} aria-hidden="true" /> Encerrar
              </button>
            </>
          )}
        </div>
      </nav>
    </main>
  );
}
