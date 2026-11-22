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

async function captureMicrophone(agora: Awaited<ReturnType<typeof loadAgora>>, microphoneId?: string) {
  try {
    return await agora.createMicrophoneAudioTrack({ encoderConfig: "speech_standard", AEC: true, ANS: true, AGC: true,
      ...(microphoneId ? { microphoneId } : {}) });
  } catch (error) {
    throw new Error(microphoneMessage(error));
  }
}

export type AudioDevice = { id: string; label: string };
const MIC_KEY = "resona.mic";
const SPEAKER_KEY = "resona.speaker";

function stored(key: string) {
  try { return window.localStorage.getItem(key) ?? ""; } catch { return ""; }
}
function store(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* preferência só desta sessão */ }
}
function toDevices(list: MediaDeviceInfo[], fallback: string): AudioDevice[] {
  const seen = new Set<string>();
  return list.filter((d) => d.deviceId && d.deviceId !== "communications" && !seen.has(d.deviceId) && seen.add(d.deviceId))
    .map((d, n) => ({ id: d.deviceId, label: d.label || `${fallback} ${n + 1}` }));
}
/** Escolher a saída de áudio depende de setSinkId (Chrome, Edge; Firefox recente). */
export const canPickSpeaker = () => typeof window !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

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
  const [mics, setMics] = useState<AudioDevice[]>([]);
  const [speakers, setSpeakers] = useState<AudioDevice[]>([]);
  const [micId, setMicId] = useState("");
  const [speakerId, setSpeakerId] = useState("");
  const [devicesBusy, setDevicesBusy] = useState(false);
  const [deviceNotice, setDeviceNotice] = useState("");
  const [testLevel, setTestLevel] = useState(0);
  const [speakerTesting, setSpeakerTesting] = useState(false);
  const micIdRef = useRef("");
  const speakerIdRef = useRef("");

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

  const loadDevices = useCallback(async () => {
    setDevicesBusy(true);
    try {
      const agora = await loadAgora();
      const micList = toDevices(await agora.getMicrophones(), "Microfone");
      let outList: AudioDevice[] = [];
      if (canPickSpeaker()) {
        try { outList = toDevices(await agora.getPlaybackDevices(), "Saída"); } catch { outList = []; }
      }
      if (!mounted.current) return;
      setMics(micList); setSpeakers(outList);
      const savedMic = micIdRef.current || stored(MIC_KEY);
      const mic = micList.find((d) => d.id === savedMic)?.id ?? micList.find((d) => d.id === "default")?.id ?? micList[0]?.id ?? "";
      const savedOut = speakerIdRef.current || stored(SPEAKER_KEY);
      const out = outList.find((d) => d.id === savedOut)?.id ?? outList.find((d) => d.id === "default")?.id ?? outList[0]?.id ?? "";
      micIdRef.current = mic; speakerIdRef.current = out;
      setMicId(mic); setSpeakerId(out);
      setDeviceNotice(micList.length ? "" : "Nenhum microfone encontrado. Conecte um e atualize a lista.");
      agora.onMicrophoneChanged = () => { void loadDevices(); };
      agora.onPlaybackDeviceChanged = () => { void loadDevices(); };
    } catch (exc) {
      if (mounted.current) {
        const known = exc && typeof exc === "object" && "code" in exc && String(exc.code) in MIC_ERRORS;
        setDeviceNotice(known || (exc instanceof Error && exc.name in MIC_ERRORS) ? microphoneMessage(exc)
          : exc instanceof Error && !("code" in exc) ? exc.message : "Não foi possível listar os dispositivos de áudio.");
      }
    } finally {
      if (mounted.current) setDevicesBusy(false);
    }
  }, []);

  async function chooseMic(id: string) {
    micIdRef.current = id; setMicId(id); store(MIC_KEY, id); setDeviceNotice("");
    const mic = active.current?.mic ?? previewMic.current;
    if (!mic) return;
    try { await mic.setDevice(id); setMicLost(false); setMicNotice(""); }
    catch { setDeviceNotice("Não foi possível trocar o microfone. Tente outro dispositivo."); }
  }

  async function chooseSpeaker(id: string) {
    speakerIdRef.current = id; setSpeakerId(id); store(SPEAKER_KEY, id); setDeviceNotice("");
    const speaker = active.current?.speaker;
    if (!speaker) return;
    try { await speaker.setPlaybackDevice(id); }
    catch { setDeviceNotice("Este navegador não deixou trocar a saída de áudio. Use o Chrome ou o Edge, ou troque nas configurações de som."); }
  }

  /** Toca um aviso curto na saída escolhida, para conferir se a voz da Lia vai sair no lugar certo. */
  async function testSpeaker() {
    if (speakerTesting) return;
    setSpeakerTesting(true); setDeviceNotice("");
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      const gain = ctx.createGain();
      gain.connect(dest);
      [523.25, 659.25, 783.99].forEach((freq, n) => {
        const osc = ctx!.createOscillator();
        osc.frequency.value = freq;
        osc.connect(gain);
        const t = ctx!.currentTime + n * 0.22;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        osc.start(t); osc.stop(t + 0.21);
      });
      const audio = new Audio();
      audio.srcObject = dest.stream;
      const sink = speakerIdRef.current;
      if (sink && "setSinkId" in audio) await (audio as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(sink);
      await audio.play();
      await new Promise((r) => setTimeout(r, 900));
      audio.pause();
    } catch {
      setDeviceNotice("Não conseguimos tocar o som de teste nesta saída.");
    } finally {
      await ctx?.close().catch(() => undefined);
      if (mounted.current) setSpeakerTesting(false);
    }
  }

  async function testMicrophone() {
    if (micOperation.current || active.current) return;
    micOperation.current = true;
    setMicBusy(true);
    setError("");
    setMicNotice("Fale algumas palavras para testar o microfone.");
    let mic: IMicrophoneAudioTrack | null = null;
    try {
      const agora = await loadAgora();
      mic = await captureMicrophone(agora, micIdRef.current || undefined);
      if (!mounted.current) { mic.close(); return; }
      previewMic.current = mic;
      const track = mic;
      const sampler = window.setInterval(() => setTestLevel(Math.round(track.getVolumeLevel() * 10) / 10), 120);
      const hasSignal = await agora.checkAudioTrackIsActive(mic, 4000).finally(() => { window.clearInterval(sampler); setTestLevel(0); });
      if (!micIdRef.current || !mics.length) void loadDevices();
      if (mounted.current) {
        setMicNotice(hasSignal ? "Microfone funcionando." : "Não detectamos sua voz. Escolha outro microfone na lista e repita o teste.");
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
      if (speakerIdRef.current && canPickSpeaker()) {
        await track.setPlaybackDevice(speakerIdRef.current).catch(() => {
          if (active.current === connection) setDeviceNotice("A saída escolhida não respondeu; a voz da Lia está na saída padrão do sistema.");
        });
      }
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
      const microphone = await captureMicrophone(agora, micIdRef.current || undefined);
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
      replacement = await captureMicrophone(await loadAgora(), micIdRef.current || undefined);
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
    devices: { mics, speakers, micId, speakerId, busy: devicesBusy, notice: deviceNotice, testLevel, speakerTesting,
      canPickSpeaker: canPickSpeaker(), load: loadDevices, chooseMic, chooseSpeaker, testSpeaker },
  };
}
