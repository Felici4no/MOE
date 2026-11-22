"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  IAgoraRTCClient, IAgoraRTCRemoteUser, IMicrophoneAudioTrack, IRemoteAudioTrack,
} from "agora-rtc-sdk-ng";
import { api, type InterviewState, type Join } from "./api";
import { Transcripts, type Line } from "./transcripts";

export type RoomState = "idle" | "connecting" | "live" | "dropped" | "ending" | "ended" | "error";

type Connection = {
  rtc: IAgoraRTCClient | null;
  mic: IMicrophoneAudioTrack | null;
  speaker: IRemoteAudioTrack | null;
  channel: string;
  agentUid: number | null;
  published: boolean;
  removeAutoplayListener?: () => void;
  pending: Pick<Line, "speaker" | "text">[];
  flushing: Promise<void> | null;
};

const MIC_ERRORS: Record<string, string> = {
  PERMISSION_DENIED: "O navegador bloqueou o microfone. Permita o acesso nas configurações deste site e tente novamente.",
  NotAllowedError: "O navegador bloqueou o microfone. Permita o acesso nas configurações deste site e tente novamente.",
  DEVICE_NOT_FOUND: "Nenhum microfone foi encontrado. Conecte um dispositivo e tente novamente.",
  NotFoundError: "Nenhum microfone foi encontrado. Conecte um dispositivo e tente novamente.",
  NOT_READABLE: "O microfone pode estar ocupado. Feche outros apps que usam áudio e tente novamente.",
  NotReadableError: "O microfone pode estar ocupado. Feche outros apps que usam áudio e tente novamente.",
};

function microphoneMessage(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code)
    : error instanceof Error ? error.name : "";
  return MIC_ERRORS[code] ?? "Não conseguimos abrir o microfone. Confira o dispositivo nas configurações de som e tente novamente.";
}

async function loadAgora() {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Abra o Pontos Fortes em HTTPS no Chrome, Safari, Edge ou Firefox para usar o microfone.");
  }
  const agora = (await import("agora-rtc-sdk-ng")).default;
  if (!agora.checkSystemRequirements()) {
    throw new Error("Este navegador não oferece o suporte de áudio necessário para a entrevista.");
  }
  agora.setLogLevel(3);
  return agora;
}

async function captureMicrophone(agora: Awaited<ReturnType<typeof loadAgora>>) {
  try {
    return await agora.createMicrophoneAudioTrack({ encoderConfig: "speech_standard", AEC: true, ANS: true, AGC: true });
  } catch (error) {
    throw new Error(microphoneMessage(error));
  }
}

function channelQuery(channel: string) {
  return `?channel=${encodeURIComponent(channel)}`;
}

/** Captura o microfone e recebe a voz da Lia pela Agora. A transcrição continua no painel. */
export function useInterviewRoom(interviewId: string) {
  const [state, setState] = useState<RoomState>("idle");
  const [error, setError] = useState("");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [reconnecting, setReconnecting] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [muted, setMuted] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [micLost, setMicLost] = useState(false);
  const [micNotice, setMicNotice] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [server, setServer] = useState<InterviewState | null>(null);
  const mounted = useRef(false);
  const active = useRef<Connection | null>(null);
  const micOperation = useRef(false);
  const previewMic = useRef<IMicrophoneAudioTrack | null>(null);

  const refresh = useCallback(async () => {
    const connection = active.current;
    try {
      const status = await api<InterviewState>(`/interviews/${interviewId}/state`);
      if (mounted.current && active.current === connection) setServer(status);
    } catch { /* mantém o último estado conhecido */ }
  }, [interviewId]);

  const dispose = useCallback(async (connection: Connection) => {
    if (active.current === connection) active.current = null;
    connection.removeAutoplayListener?.();
    connection.mic?.close();
    connection.mic = null;
    connection.speaker?.stop();
    connection.speaker = null;
    connection.rtc?.removeAllListeners();
    await connection.rtc?.leave().catch(() => undefined);
  }, []);

  const leaveAttempt = useCallback(async (channel: string) => {
    if (!channel) return;
    try {
      const status = await api<InterviewState>(`/interviews/${interviewId}/leave${channelQuery(channel)}`,
        { method: "POST", signal: AbortSignal.timeout?.(6000) });
      if (mounted.current && !active.current) setServer(status);
    } catch { /* o servidor fecha a tentativa se o navegador ficar sem sinal */ }
  }, [interviewId]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const sendLeave = () => {
      const channel = active.current?.channel;
      if (channel) navigator.sendBeacon(`/api/v1/interviews/${interviewId}/leave${channelQuery(channel)}`);
    };
    window.addEventListener("pagehide", sendLeave);
    return () => {
      mounted.current = false;
      window.removeEventListener("pagehide", sendLeave);
      sendLeave();
      previewMic.current?.close();
      previewMic.current = null;
      if (active.current) void dispose(active.current);
    };
  }, [dispose, interviewId, refresh]);

  const flush = useCallback((connection: Connection) => {
    if (!connection.channel) return Promise.resolve();
    if (connection.flushing) return connection.flushing;
    const batch = connection.pending.splice(0, 50);
    connection.flushing = api<InterviewState>(`/interviews/${interviewId}/transcript${channelQuery(connection.channel)}`,
      { body: batch, signal: AbortSignal.timeout?.(6000) })
      .then((status) => { if (active.current === connection) setServer(status); })
      .catch(() => { connection.pending.unshift(...batch); })
      .finally(() => { connection.flushing = null; });
    return connection.flushing;
  }, [interviewId]);

  useEffect(() => {
    if (state !== "live") return;
    const connection = active.current;
    if (!connection) return;
    const timer = window.setInterval(() => { void flush(connection); }, 4000);
    const levelSampler = window.setInterval(() => {
      const mic = connection.mic;
      const level = !mic || mic.muted || mic.getMediaStreamTrack().readyState !== "live" ? 0 : mic.getVolumeLevel();
      setMicLevel(Math.round(level * 10) / 10);
    }, 250);
    return () => { window.clearInterval(timer); window.clearInterval(levelSampler); };
  }, [state, flush]);

  // O servidor pode concluir, pausar ou reiniciar a entrevista enquanto a mídia está aberta.
  const serverStatus = server?.status;
  const lastReason = server?.attempts[server.attempts.length - 1]?.end_reason;
  useEffect(() => {
    const connection = active.current;
    if (!connection || state !== "live" || !serverStatus || serverStatus === "live") return;
    const delay = serverStatus === "cancelled" ? 9000 : lastReason === "silence" ? 8000 : 0;
    const timer = window.setTimeout(() => {
      if (active.current !== connection) return;
      void dispose(connection);
      setReconnecting(false);
      setState(serverStatus === "ready" ? "dropped" : "ended");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [serverStatus, lastReason, state, dispose]);

  const watchMicrophone = useCallback((connection: Connection, mic: IMicrophoneAudioTrack) => {
    mic.on("track-ended", () => {
      if (active.current !== connection || connection.mic !== mic) return;
      setMicLost(true);
      setMicLevel(0);
      setMicNotice("O microfone foi desconectado. Reconecte o dispositivo para continuar.");
    });
  }, []);

  async function testMicrophone() {
    if (micOperation.current || active.current) return;
    micOperation.current = true;
    setMicBusy(true);
    setError("");
    setMicNotice("Fale algumas palavras para testar o microfone.");
    let mic: IMicrophoneAudioTrack | null = null;
    try {
      const agora = await loadAgora();
      mic = await captureMicrophone(agora);
      if (!mounted.current) { mic.close(); return; }
      previewMic.current = mic;
      const hasSignal = await agora.checkAudioTrackIsActive(mic, 4000);
      if (mounted.current) {
        setMicNotice(hasSignal ? "Microfone funcionando." : "Não detectamos sua voz. Confira o microfone selecionado no sistema e repita o teste.");
      }
    } catch (exc) {
      if (mounted.current) setMicNotice(exc instanceof Error ? exc.message : "Não foi possível testar o microfone.");
    } finally {
      if (previewMic.current === mic) mic?.close();
      previewMic.current = null;
      micOperation.current = false;
      if (mounted.current) setMicBusy(false);
    }
  }

  const subscribeToLia = useCallback(async (connection: Connection, user: IAgoraRTCRemoteUser) => {
    try {
      const track = await connection.rtc?.subscribe(user, "audio");
      if (active.current !== connection || !track) return;
      connection.speaker = track;
      setAudioBlocked(false);
      track.play();
    } catch {
      if (active.current === connection) setAudioBlocked(true);
    }
  }, []);

  async function playLia() {
    const connection = active.current;
    if (!connection) return;
    if (connection.speaker) {
      setAudioBlocked(false);
      connection.speaker.play();
      return;
    }
    const liaison = connection.rtc?.remoteUsers.find((user) => user.uid === connection.agentUid && user.hasAudio);
    if (liaison) await subscribeToLia(connection, liaison);
  }

  async function start() {
    if (active.current || micOperation.current) return;
    const connection: Connection = {
      rtc: null, mic: null, speaker: null, channel: "", agentUid: null,
      published: false, pending: [], flushing: null,
    };
    active.current = connection;
    setState("connecting");
    setError("");
    setMicNotice("");
    setMicLost(false);
    setMicLevel(0);
    setMuted(false);
    setAudioBlocked(false);
    setReconnecting(false);
    setAgentSpeaking(false);
    setConnectionMessage("Aguardando o microfone…");
    try {
      const agora = await loadAgora();
      const microphone = await captureMicrophone(agora);
      if (active.current !== connection) { microphone.close(); return; }
      connection.mic = microphone;
      watchMicrophone(connection, microphone);
      setConnectionMessage("Conectando o microfone…");
      const join = await api<Join>(`/interviews/${interviewId}/prepare`, { method: "POST" });
      if (active.current !== connection) return;
      connection.agentUid = join.agent_uid;

      const rtc = agora.createClient({ mode: "rtc", codec: "vp8" });
      connection.rtc = rtc;
      const markAutoplayBlocked = () => {
        if (active.current === connection) setAudioBlocked(true);
      };
      agora.on("autoplay-failed", markAutoplayBlocked);
      connection.removeAutoplayListener = () => { agora.off("autoplay-failed", markAutoplayBlocked); };

      rtc.on("connection-state-change", (current) => {
        if (active.current !== connection || !connection.published) return;
        setReconnecting(current === "RECONNECTING");
        if (current === "DISCONNECTED") {
          const stopping = dispose(connection);
          setState("dropped");
          setError("A conexão de áudio caiu. Volte à entrevista para continuar.");
          void Promise.all([stopping, flush(connection)]).then(() => leaveAttempt(join.channel));
        }
      });
      rtc.on("user-published", (user, media) => {
        if (media === "audio" && user.uid === join.agent_uid && active.current === connection) {
          void subscribeToLia(connection, user);
        }
      });
      rtc.on("user-unpublished", (user, media) => {
        if (media === "audio" && user.uid === join.agent_uid && active.current === connection) {
          connection.speaker?.stop();
          connection.speaker = null;
          setAgentSpeaking(false);
        }
      });
      const parser = new Transcripts();
      rtc.enableAudioVolumeIndicator();
      rtc.on("volume-indicator", (volumes) => {
        if (active.current === connection) {
          setAgentSpeaking(volumes.some((v) => v.uid === join.agent_uid && v.level > 8));
        }
      });
      rtc.on("stream-message", (_uid, payload) => {
        if (active.current !== connection) return;
        const line = parser.feed(payload);
        if (!line) return;
        setLines((current) => {
          const index = current.findIndex((l) => l.turn === line.turn && l.speaker === line.speaker);
          if (index === -1) return [...current, line].slice(-200);
          const next = [...current];
          next[index] = line;
          return next;
        });
        if (line.final) connection.pending.push({ speaker: line.speaker, text: line.text });
      });

      await rtc.join(join.app_id, join.channel, join.token, join.uid);
      if (active.current !== connection) { await rtc.leave().catch(() => undefined); return; }
      if (microphone.getMediaStreamTrack().readyState === "ended") {
        throw new Error("O microfone desconectou durante a entrada. Reconecte o dispositivo e tente novamente.");
      }
      try {
        await rtc.publish(microphone);
      } catch {
        throw new Error("Não foi possível enviar o áudio do microfone. Verifique a conexão e tente entrar de novo.");
      }
      if (active.current !== connection) return;
      setConnectionMessage("Chamando a Lia…");
      const started = await api<Join>(`/interviews/${interviewId}/join${channelQuery(join.channel)}`, { method: "POST" });
      connection.channel = started.channel;
      if (active.current !== connection) { await leaveAttempt(started.channel); return; }
      connection.published = true;
      if (rtc.connectionState === "DISCONNECTED") {
        throw new Error("A conexão de áudio caiu antes da entrada. Verifique a internet e tente de novo.");
      }
      setReconnecting(rtc.connectionState === "RECONNECTING");
      setServer(null);
      setState("live");
      void flush(connection);
    } catch (exc) {
      if (active.current !== connection) return;
      await Promise.all([dispose(connection), leaveAttempt(connection.channel)]);
      if (mounted.current && !active.current) {
        setError(exc instanceof Error ? exc.message : "Não foi possível entrar na sala.");
        setState("error");
      }
    }
  }

  async function repairMicrophone() {
    const connection = active.current;
    const rtc = connection?.rtc;
    if (!connection || !rtc || rtc.connectionState !== "CONNECTED" || micOperation.current) return;
    micOperation.current = true;
    setMicBusy(true);
    setMicNotice("Reconectando o microfone…");
    let replacement: IMicrophoneAudioTrack | null = null;
    try {
      replacement = await captureMicrophone(await loadAgora());
      if (active.current !== connection) return;
      const previous = connection.mic;
      if (previous) {
        await rtc.unpublish(previous).catch(() => undefined);
        if (active.current !== connection) return;
        previous.close();
        connection.mic = null;
      }
      if (active.current !== connection) return;
      if (muted) await replacement.setMuted(true);
      await rtc.publish(replacement);
      if (active.current !== connection) return;
      connection.mic = replacement;
      watchMicrophone(connection, replacement);
      setMicLost(false);
      setMicNotice("");
    } catch (exc) {
      if (active.current === connection) {
        setMicNotice(exc instanceof Error ? exc.message : "Não foi possível reconectar o microfone.");
      }
    } finally {
      if (connection.mic !== replacement) replacement?.close();
      micOperation.current = false;
      if (mounted.current) setMicBusy(false);
    }
  }

  async function toggleMute() {
    const connection = active.current;
    const mic = connection?.mic;
    if (!mic || micOperation.current || micLost) return;
    micOperation.current = true;
    setMicBusy(true);
    try {
      await mic.setMuted(!mic.muted);
      if (active.current === connection) {
        setMuted(mic.muted);
        setMicNotice("");
      }
    } catch {
      if (active.current === connection) setMicNotice("Não foi possível mudar o estado do microfone. Tente novamente.");
    } finally {
      micOperation.current = false;
      if (mounted.current) setMicBusy(false);
    }
  }

  async function finish() {
    setState("ending");
    const connection = active.current;
    if (connection) {
      await connection.flushing;
      await flush(connection);
      await dispose(connection);
    }
    setState("ended");
  }

  return {
    state, error, connectionMessage, reconnecting, lines, muted, micBusy, micLost, micNotice, micLevel,
    audioBlocked, agentSpeaking, server, testMicrophone, repairMicrophone, playLia, start, toggleMute, finish,
  };
}
