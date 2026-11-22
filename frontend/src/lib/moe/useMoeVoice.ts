"use client";

/**
 * Voz no escritório do MOE pela Agora Conversational AI.
 *
 * Um personagem por vez: o agente da cena fala a fala escrita pelo servidor (memória e
 * aprofundamento) com a voz do personagem; a pessoa responde pelo microfone. A transcrição
 * final vai para o mesmo POST de resposta do modo texto. Sem Agora no servidor, sem
 * microfone ou com queda, a conversa continua por texto do mesmo ponto.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { IAgoraRTCClient, IAgoraRTCRemoteUser, IMicrophoneAudioTrack, IRemoteAudioTrack } from "agora-rtc-sdk-ng";
import { api } from "@/lib/api";
import { captureMicrophone, loadAgora, useAudioDevices } from "@/lib/audio";
import { Transcripts } from "@/lib/transcripts";

export type VoiceState = "checking" | "unavailable" | "off" | "connecting" | "live" | "error";
export type VoiceStatus = { live: boolean; reason: string | null; ended?: boolean; channel?: string; agent_uid?: number; scene_id?: string };
type Join = { app_id: string; channel: string; uid: number; token: string; agent_uid: number };

type Connection = {
  rtc: IAgoraRTCClient | null;
  mic: IMicrophoneAudioTrack | null;
  speaker: IRemoteAudioTrack | null;
  channel: string;
  uid: number;
  joined: boolean;
};

/** Silêncio depois da última frase final antes de enviar a resposta sozinha. */
export const AUTO_SEND_MS = 2600;

export function useMoeVoice(sessionId: string | null) {
  const [state, setState] = useState<VoiceState>("checking");
  const [reason, setReason] = useState("");
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  /** O que a pessoa está dizendo agora (parcial) e o que já foi fechado nesta resposta. */
  const [interim, setInterim] = useState("");
  const [heard, setHeard] = useState("");
  const [lastHeardAt, setLastHeardAt] = useState(0);
  const active = useRef<Connection | null>(null);
  const listening = useRef(false);
  const finals = useRef(new Map<string, string>());
  const mounted = useRef(false);
  const devices = useAudioDevices(() => ({ mic: active.current?.mic ?? null, speaker: active.current?.speaker ?? null }));
  const { micIdRef, route } = devices;

  const base = sessionId ? `/moe/play/sessions/${encodeURIComponent(sessionId)}/voice` : "";

  const dispose = useCallback(async (connection: Connection) => {
    if (active.current === connection) active.current = null;
    connection.mic?.close();
    connection.mic = null;
    connection.speaker?.stop();
    connection.speaker = null;
    connection.rtc?.removeAllListeners();
    await connection.rtc?.leave().catch(() => undefined);
    if (mounted.current) { setAgentSpeaking(false); setMicLevel(0); }
  }, []);

  const leaveServer = useCallback(async (channel: string) => {
    if (!base || !channel) return;
    await api(`${base}/leave?channel=${encodeURIComponent(channel)}`, { method: "POST", signal: AbortSignal.timeout?.(6000) })
      .catch(() => undefined);
  }, [base]);

  // Ao abrir: a voz está disponível neste servidor? Uma sala antiga (recarregou a página) é fechada.
  useEffect(() => {
    mounted.current = true;
    if (!base) { setState("unavailable"); return; }
    let gone = false;
    api<VoiceStatus>(base).then(async (status) => {
      if (gone) return;
      if (status.live) await api(`${base}/leave`, { method: "POST" }).catch(() => undefined);
      if (gone) return;
      if (status.reason) { setReason(status.reason); setState("unavailable"); } else setState("off");
    }).catch(() => { if (!gone) { setReason("Não foi possível verificar a voz. Continue por texto."); setState("unavailable"); } });
    const sendLeave = () => {
      const channel = active.current?.channel;
      if (channel) navigator.sendBeacon(`/api/v1${base}/leave?channel=${encodeURIComponent(channel)}`);
    };
    window.addEventListener("pagehide", sendLeave);
    return () => {
      gone = true;
      mounted.current = false;
      window.removeEventListener("pagehide", sendLeave);
      sendLeave();
      if (active.current) void dispose(active.current);
    };
  }, [base, dispose]);

  useEffect(() => {
    if (state !== "live") return;
    const timer = window.setInterval(() => {
      const mic = active.current?.mic;
      const level = !mic || mic.muted || mic.getMediaStreamTrack().readyState !== "live" ? 0 : mic.getVolumeLevel();
      setMicLevel(Math.round(level * 10) / 10);
    }, 200);
    return () => window.clearInterval(timer);
  }, [state]);

  const subscribe = useCallback(async (connection: Connection, user: IAgoraRTCRemoteUser) => {
    try {
      const track = await connection.rtc?.subscribe(user, "audio");
      if (active.current !== connection || !track) return;
      connection.speaker?.stop();
      connection.speaker = track;
      setAudioBlocked(false);
      track.play();
      await route(track, "A saída escolhida não respondeu; as vozes estão na saída padrão do sistema.");
    } catch {
      if (active.current === connection) setAudioBlocked(true);
    }
  }, [route]);

  /** Começa a ouvir a pessoa (depois que o personagem terminou de falar) ou para de ouvir. */
  const listen = useCallback((on: boolean) => {
    listening.current = on;
    finals.current.clear();
    setInterim(""); setHeard(""); setLastHeardAt(0);
  }, []);

  /** Esvazia a resposta ouvida (para falar de novo). */
  const clear = useCallback(() => {
    finals.current.clear();
    setInterim(""); setHeard(""); setLastHeardAt(0);
  }, []);

  const start = useCallback(async () => {
    if (!base || active.current) return;
    const connection: Connection = { rtc: null, mic: null, speaker: null, channel: "", uid: 0, joined: false };
    active.current = connection;
    setState("connecting"); setReason(""); setMuted(false); setAudioBlocked(false);
    try {
      const agora = await loadAgora();
      const mic = await captureMicrophone(agora, micIdRef.current || undefined);
      if (active.current !== connection) { mic.close(); return; }
      connection.mic = mic;
      const join = await api<Join>(`${base}/prepare`, { method: "POST" });
      connection.channel = join.channel;
      connection.uid = join.uid;
      if (active.current !== connection) { await leaveServer(join.channel); return; }
      const rtc = agora.createClient({ mode: "rtc", codec: "vp8" });
      connection.rtc = rtc;
      rtc.on("connection-state-change", (current) => {
        if (active.current !== connection || !connection.joined || current !== "DISCONNECTED") return;
        void dispose(connection).then(() => leaveServer(connection.channel));
        setReason("A conexão de áudio caiu. A conversa continua por texto; você pode ativar a voz de novo.");
        setState("error");
      });
      // Cada cena tem o próprio agente (uid novo): assina qualquer voz que entrar no canal.
      rtc.on("user-published", (user, media) => {
        if (media === "audio" && user.uid !== join.uid && active.current === connection) void subscribe(connection, user);
      });
      rtc.enableAudioVolumeIndicator();
      rtc.on("volume-indicator", (volumes) => {
        if (active.current === connection) setAgentSpeaking(volumes.some((v) => v.uid !== join.uid && Number(v.uid) !== 0 && v.level > 8));
      });
      const parser = new Transcripts();
      rtc.on("stream-message", (_uid, payload) => {
        if (active.current !== connection || !listening.current) return;
        const line = parser.feed(payload);
        if (!line || line.speaker !== "user") return;
        if (line.final) {
          finals.current.set(line.turn, line.text);
          setHeard([...finals.current.values()].join(" "));
          setInterim("");
        } else setInterim(line.text);
        setLastHeardAt(Date.now());
      });
      await rtc.join(join.app_id, join.channel, join.token, join.uid);
      if (active.current !== connection) { await rtc.leave().catch(() => undefined); return; }
      await rtc.publish(mic).catch(() => { throw new Error("Não foi possível enviar o áudio do microfone. Verifique a conexão."); });
      connection.joined = true;
      const status = await api<VoiceStatus>(`${base}/join?channel=${encodeURIComponent(join.channel)}`, { method: "POST" });
      if (active.current !== connection) { await leaveServer(join.channel); return; }
      if (!status.live) throw new Error(status.reason || "A voz não ficou disponível. Continue por texto.");
      setState("live");
    } catch (exc) {
      if (active.current !== connection) return;
      await dispose(connection);
      await leaveServer(connection.channel);
      if (mounted.current) {
        setReason(exc instanceof Error ? exc.message : "Não foi possível ativar a voz. Continue por texto.");
        setState("error");
      }
    }
  }, [base, dispose, leaveServer, micIdRef, subscribe]);

  /** Volta para o texto, do mesmo ponto da conversa. */
  const stop = useCallback(async (why = "") => {
    const connection = active.current;
    listening.current = false;
    if (connection) { await dispose(connection); await leaveServer(connection.channel); }
    if (mounted.current) { setReason(why); setState((s) => (s === "unavailable" ? s : "off")); }
  }, [dispose, leaveServer]);

  /** O servidor devolve o estado da voz junto da resposta: o próximo personagem entrou, ou a voz caiu. */
  const apply = useCallback((status: VoiceStatus | undefined) => {
    if (!status || !active.current) return;
    if (status.ended) { void stop(); return; }
    if (!status.live) {
      void stop(status.reason || "A voz caiu. A conversa continua por texto.");
      if (mounted.current) setState("error");
    }
  }, [stop]);

  const toggleMute = useCallback(async () => {
    const mic = active.current?.mic;
    if (!mic) return;
    await mic.setMuted(!mic.muted).catch(() => undefined);
    setMuted(mic.muted);
  }, []);

  const playVoices = useCallback(() => {
    active.current?.speaker?.play();
    setAudioBlocked(false);
  }, []);

  return {
    state, reason, live: state === "live", agentSpeaking, micLevel, muted, audioBlocked, interim, heard, lastHeardAt,
    start, stop, apply, listen, clear, toggleMute, playVoices,
    devices: { mics: devices.mics, speakers: devices.speakers, micId: devices.micId, speakerId: devices.speakerId,
      busy: devices.busy, notice: devices.notice, testLevel: devices.testLevel, speakerTesting: devices.speakerTesting,
      canPickSpeaker: devices.canPickSpeaker, load: devices.load, chooseMic: devices.chooseMic,
      chooseSpeaker: devices.chooseSpeaker, testSpeaker: devices.testSpeaker },
  };
}

export type MoeVoice = ReturnType<typeof useMoeVoice>;
