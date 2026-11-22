"use client";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Interview, type LiveEvidence } from "@/lib/api";
import { useMe } from "@/components/Shell";
import { useInterviewRoom } from "@/lib/useInterviewRoom";
import { Chat, Mic, MicOff, Settings, Stop } from "@/components/icons";
import { Tip } from "@/components/Tip";
import { AudioPanel } from "./AudioPanel";
import s from "./room.module.css";

function Highlighted({ text, evidence }: { text: string; evidence: LiveEvidence[] }) {
  const lower = text.toLocaleLowerCase("pt-BR");
  const hit = evidence.find((e) => lower.includes(e.quote.toLocaleLowerCase("pt-BR")));
  if (!hit) return <>{text}</>;
  const at = lower.indexOf(hit.quote.toLocaleLowerCase("pt-BR"));
  return (
    <>
      {text.slice(0, at)}<mark className="grifo-draw">{text.slice(at, at + hit.quote.length)}</mark>{text.slice(at + hit.quote.length)}
      <span className={`tag ${s.tag}`} data-domain={hit.domain}>{hit.theme}</span>
    </>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Room key={id} id={id} />;
}

function Room({ id }: { id: string }) {
  const router = useRouter();
  const { me } = useMe();
  const room = useInterviewRoom(id);
  const log = useRef<HTMLOListElement>(null);
  const [evidence, setEvidence] = useState<LiveEvidence[]>([]);
  const [finishing, setFinishing] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [endError, setEndError] = useState("");
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState("");
  const [audioOpen, setAudioOpen] = useState(false);

  useEffect(() => {
    if (room.state !== "live") return;
    const started = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    const poll = setInterval(() => { api<LiveEvidence[]>(`/interviews/${id}/evidence`).then(setEvidence).catch(() => undefined); }, 5000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [room.state, id]);

  useEffect(() => { log.current?.lastElementChild?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [room.lines.length]);

  async function end() {
    setFinishing("Montando seu Mapa com o que você disse…");
    await room.finish();
    try {
      await api(`/interviews/${id}/finish`, { method: "POST" });
      router.replace(`/app/perfil/${id}`);
    } catch (e) {
      setFinishing("");
      setEndError(`${(e as Error).message} Seu áudio já foi encerrado; tente gerar o Mapa de novo.`);
    }
  }

  async function restart() {
    if (room.server?.live && !window.confirm("Encerrar a sessão atual e iniciar uma nova entrevista de teste?")) return;
    setRestarting(true);
    setRestartError("");
    try {
      const next = await api<Interview>(`/interviews/${id}/restart`, { method: "POST" });
      router.replace(`/app/entrevista/${next.id}`);
    } catch (e) {
      setRestartError((e as Error).message);
      setRestarting(false);
    }
  }

  const lastLia = [...room.lines].reverse().find((line) => line.speaker === "assistant" && line.final);
  const srv = room.server;
  const used = srv?.attempts.length ?? 0;
  const max = srv?.max_attempts ?? 3;
  const strikes = srv?.violations.length ?? 0;
  const maxStrikes = srv?.max_strikes ?? 3;
  const next = Math.min(used + 1, max);
  const cancelled = srv?.status === "cancelled";
  const done = srv?.status === "analyzed";
  const restarted = srv?.status === "restarted";
  const canJoin = !cancelled && !done && !restarted && used < max;
  const lastEnd = srv?.attempts[used - 1]?.end_reason;
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className={s.room}>
      <section className={s.stage} aria-label="Entrevistadora">
        <div className={s.top}>
          {room.state === "live" ? <span className={room.reconnecting ? s.idle : s.live}>{room.reconnecting ? "Reconectando" : "Ao vivo"}</span> : <span>{srv?.kind === "rapida" ? "Cerca de 3 minutos" : "Cerca de 10 minutos"}</span>}
          <span className={s.counters}>
            {srv && (room.state === "live" || canJoin) && <span>Tentativa {room.state === "live" ? used : next} de {max}</span>}
            {strikes > 0 && <span className={s.strikeCount}>Advertências {strikes} de {maxStrikes}</span>}
            {room.state === "live" && <span aria-label={`Tempo de conversa ${mmss}`}>{mmss}</span>}
          </span>
        </div>

        <div className={s.scene} data-speaking={room.agentSpeaking || undefined}>
          <div className={s.presence} aria-hidden>
            <span className={s.initial}>Lia</span>
            <span className={s.wave}><i /><i /><i /><i /><i /></span>
          </div>
          {restarted ? (
            <div className={s.gate}>
              <h1>Entrevista reiniciada</h1>
              <p>Uma nova sessão foi aberta para você recomeçar do zero.</p>
            </div>
          ) : cancelled && room.state !== "live" ? (
            <div className={s.gate} role="alert">
              <h1>Entrevista cancelada</h1>
              <p>Ela foi encerrada depois de {maxStrikes} tentativas de tirar a conversa do papel de entrevista, como combinado no início. Os horários de cada advertência ficaram registrados. Fale com quem enviou o convite ou com o suporte.</p>
            </div>
          ) : done && room.state !== "live" ? (
            <div className={s.gate}>
              <h1>Seu Mapa está pronto</h1>
              <p>{used >= max ? "As 3 tentativas foram usadas, então montamos o Mapa com o que vocês conversaram." : "A entrevista foi concluída."}</p>
              <button className="btn btn-paper" onClick={() => router.replace(`/app/perfil/${id}`)}>Ver meu Mapa</button>
            </div>
          ) : room.state === "idle" || room.state === "error" || room.state === "dropped" ? (
            <div className={s.gate}>
              <h1>{lastEnd === "silence" ? "Pausamos por falta de resposta" : room.state === "dropped" ? "A conexão caiu" : used > 0 ? "Vamos continuar?" : "Pronto para conversar com a Lia?"}</h1>
              <p className={s.rulesLine}>
                {room.state === "dropped" || used > 0 ? `Você volta de onde parou · tentativa ${next} de ${max}` : "Uma pergunta por vez, com exemplos reais"}
                <Tip>Até {max} tentativas se a conexão cair. Depois de 10 s em silêncio a Lia pergunta se você está aí; com 30 s, a tentativa pausa. {maxStrikes} tentativas de desviar a conversa cancelam a sessão.</Tip>
              </p>
              {room.error && <p className="alert alert-error" role="alert">{room.error}</p>}
              {canJoin && (
                <>
                  <AudioPanel devices={room.devices} onTestMic={room.testMicrophone} micBusy={room.micBusy} micNotice={room.micNotice} />
                  <div className={s.controls}>
                    <button className="btn btn-primary btn-lg" onClick={room.start} disabled={restarting || room.micBusy}>
                      <Mic />{used > 0 ? `Entrar de novo (${next} de ${max})` : "Entrar na conversa"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : room.state === "connecting" ? (
            <div className={s.gate} role="status"><span className="spinner" aria-hidden /> {room.connectionMessage}</div>
          ) : finishing ? (
            <div className={s.gate} role="status"><span className="spinner" aria-hidden /> {finishing}</div>
          ) : null}
        </div>

        {room.state === "live" && strikes > 0 && (
          <p className={s.strike} role="alert">
            <b>Advertência {strikes} de {maxStrikes}.</b> {srv?.violations[strikes - 1]?.label}.{" "}
            {strikes < maxStrikes ? `Na ${maxStrikes}ª, a entrevista é cancelada.` : "A entrevista foi cancelada."}
          </p>
        )}
        {endError && <p className="alert alert-error" role="alert">{endError} <button className="btn btn-ghost" onClick={end}>Gerar Mapa</button></p>}
        {restartError && <p className="alert alert-error" role="alert">{restartError}</p>}
        {room.state === "live" && (
          <>
            {room.micNotice && <p className="alert alert-info" role="status">{room.micNotice}</p>}
            <div className={s.micStatus}>
              <span>{room.micLost ? "Microfone desconectado" : room.muted ? "Microfone silenciado" : "Sinal do microfone"}</span>
              <meter min={0} max={1} value={room.micLevel} aria-label="Nível do microfone" />
            </div>
            {audioOpen && <AudioPanel devices={room.devices} micBusy={room.micBusy} live />}
          </>
        )}
        <div className={s.controls}>
          {room.state === "live" && (
            room.micLost ? (
              <button className="btn" onClick={room.repairMicrophone} disabled={room.micBusy || room.reconnecting}>
                <Mic />Reconectar microfone
              </button>
            ) : (
              <button className="btn" onClick={room.toggleMute} aria-pressed={room.muted} disabled={room.micBusy || room.reconnecting}>
                {room.muted ? <Mic /> : <MicOff />}{room.muted ? "Ativar microfone" : "Silenciar"}
              </button>
            )
          )}
          {room.state === "live" && (
            <button className="btn" onClick={() => setAudioOpen(!audioOpen)} aria-expanded={audioOpen}><Settings />Áudio</button>
          )}
          {room.state === "live" && room.audioBlocked && (
            <button className="btn" onClick={room.playLia}>Ativar áudio da Lia</button>
          )}
          {me.can_restart_interviews && srv && (
            <button className="btn" onClick={restart} disabled={restarting || room.state === "connecting" || Boolean(finishing)}>
              {restarting ? "Reiniciando…" : restarted ? "Abrir nova sessão" : "Recomeçar entrevista"}
            </button>
          )}
          <button className={`btn btn-primary ${s.end}`} onClick={end} disabled={room.state !== "live" || Boolean(finishing) || restarting || restarted}><Stop />Encerrar</button>
        </div>
      </section>

      <aside className={s.transcript} aria-labelledby="pp">
        <h2 id="pp">Transcrição <Tip side="end">Falas suas que mostram um ponto forte aparecem destacadas.</Tip></h2>
        <p className="sr-only" role="status">{lastLia?.text}</p>
        {room.lines.length === 0 ? (
          <p className={s.empty}><Chat />A conversa aparece aqui.</p>
        ) : (
          <ol ref={log} className={s.log} aria-live="off">
            {room.lines.map((line) => (
              <li key={`${line.speaker}-${line.turn}`} data-speaker={line.speaker} data-final={line.final || undefined}>
                <b aria-label={line.speaker === "assistant" ? "Lia" : "Você"}>{line.speaker === "assistant" ? "P" : "R"}</b>
                <p>{line.speaker === "user" ? <Highlighted text={line.text} evidence={evidence} /> : line.text}</p>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}
