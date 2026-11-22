"use client";

/** Áudio pela Agora compartilhado pela sala da Lia e pela voz do MOE: SDK, microfone e dispositivos. */
import { useCallback, useEffect, useRef, useState } from "react";
import type { IMicrophoneAudioTrack, IRemoteAudioTrack } from "agora-rtc-sdk-ng";

type AgoraRTC = typeof import("agora-rtc-sdk-ng").default;

export const MIC_ERRORS: Record<string, string> = {
  PERMISSION_DENIED: "O navegador bloqueou o microfone. Permita o acesso nas configurações deste site e tente novamente.",
  NotAllowedError: "O navegador bloqueou o microfone. Permita o acesso nas configurações deste site e tente novamente.",
  DEVICE_NOT_FOUND: "Nenhum microfone foi encontrado. Conecte um dispositivo e tente novamente.",
  NotFoundError: "Nenhum microfone foi encontrado. Conecte um dispositivo e tente novamente.",
  NOT_READABLE: "O microfone pode estar ocupado. Feche outros apps que usam áudio e tente novamente.",
  NotReadableError: "O microfone pode estar ocupado. Feche outros apps que usam áudio e tente novamente.",
};

export function microphoneMessage(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code)
    : error instanceof Error ? error.name : "";
  return MIC_ERRORS[code] ?? "Não conseguimos abrir o microfone. Confira o dispositivo nas configurações de som e tente novamente.";
}

declare global {
  interface Window {
    /** Só fora de produção: SDK substituto para testes ponta a ponta e gravação de demonstração. */
    __agoraRTCOverride?: AgoraRTC;
  }
}

export async function loadAgora(): Promise<AgoraRTC> {
  if (process.env.NODE_ENV !== "production" && window.__agoraRTCOverride) return window.__agoraRTCOverride;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Abra o Resona em HTTPS no Chrome, Safari, Edge ou Firefox para usar o microfone.");
  }
  const agora = (await import("agora-rtc-sdk-ng")).default;
  if (!agora.checkSystemRequirements()) {
    throw new Error("Este navegador não oferece o suporte de áudio necessário para a conversa por voz.");
  }
  agora.setLogLevel(3);
  return agora;
}

export async function captureMicrophone(agora: AgoraRTC, microphoneId?: string) {
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

type Tracks = () => { mic: IMicrophoneAudioTrack | null; speaker: IRemoteAudioTrack | null };

/** Entrada e saída de áudio escolhidas pela pessoa, lembradas neste navegador e aplicadas às faixas abertas. */
export function useAudioDevices(tracks: Tracks) {
  const mounted = useRef(false);
  const tracksRef = useRef(tracks);
  useEffect(() => { tracksRef.current = tracks; });
  const [mics, setMics] = useState<AudioDevice[]>([]);
  const [speakers, setSpeakers] = useState<AudioDevice[]>([]);
  const [micId, setMicId] = useState("");
  const [speakerId, setSpeakerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [testLevel, setTestLevel] = useState(0);
  const [speakerTesting, setSpeakerTesting] = useState(false);
  const micIdRef = useRef("");
  const speakerIdRef = useRef("");

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const load = useCallback(async () => {
    setBusy(true);
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
      setNotice(micList.length ? "" : "Nenhum microfone encontrado. Conecte um e atualize a lista.");
      agora.onMicrophoneChanged = () => { void load(); };
      agora.onPlaybackDeviceChanged = () => { void load(); };
    } catch (exc) {
      if (mounted.current) {
        const known = exc && typeof exc === "object" && "code" in exc && String(exc.code) in MIC_ERRORS;
        setNotice(known || (exc instanceof Error && exc.name in MIC_ERRORS) ? microphoneMessage(exc)
          : exc instanceof Error && !("code" in exc) ? exc.message : "Não foi possível listar os dispositivos de áudio.");
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, []);

  const chooseMic = useCallback(async (id: string) => {
    micIdRef.current = id; setMicId(id); store(MIC_KEY, id); setNotice("");
    const mic = tracksRef.current().mic;
    if (!mic) return;
    try { await mic.setDevice(id); }
    catch { setNotice("Não foi possível trocar o microfone. Tente outro dispositivo."); }
  }, []);

  const chooseSpeaker = useCallback(async (id: string) => {
    speakerIdRef.current = id; setSpeakerId(id); store(SPEAKER_KEY, id); setNotice("");
    const speaker = tracksRef.current().speaker;
    if (!speaker) return;
    try { await speaker.setPlaybackDevice(id); }
    catch { setNotice("Este navegador não deixou trocar a saída de áudio. Use o Chrome ou o Edge, ou troque nas configurações de som."); }
  }, []);

  /** Aplica a saída escolhida a uma voz recém-assinada. */
  const route = useCallback(async (speaker: IRemoteAudioTrack, failure: string) => {
    if (!speakerIdRef.current || !canPickSpeaker()) return;
    await speaker.setPlaybackDevice(speakerIdRef.current).catch(() => { if (mounted.current) setNotice(failure); });
  }, []);

  /** Toca um aviso curto na saída escolhida, para conferir se a voz vai sair no lugar certo. */
  const testSpeaker = useCallback(async () => {
    setSpeakerTesting(true); setNotice("");
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
      setNotice("Não conseguimos tocar o som de teste nesta saída.");
    } finally {
      await ctx?.close().catch(() => undefined);
      if (mounted.current) setSpeakerTesting(false);
    }
  }, []);

  return {
    mics, speakers, micId, speakerId, busy, notice, testLevel, speakerTesting, canPickSpeaker: canPickSpeaker(),
    load, chooseMic, chooseSpeaker, testSpeaker, route, setNotice, setTestLevel, micIdRef, speakerIdRef,
  };
}
