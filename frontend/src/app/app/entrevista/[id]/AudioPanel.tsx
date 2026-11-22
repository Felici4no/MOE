"use client";
import { useEffect } from "react";
import type { AudioDevice } from "@/lib/useInterviewRoom";
import { Mic, Speaker } from "@/components/icons";
import { Tip } from "@/components/Tip";
import s from "./room.module.css";

type Devices = {
  mics: AudioDevice[]; speakers: AudioDevice[]; micId: string; speakerId: string; busy: boolean; notice: string;
  testLevel: number; speakerTesting: boolean; canPickSpeaker: boolean;
  load: () => Promise<void>; chooseMic: (id: string) => Promise<void>; chooseSpeaker: (id: string) => Promise<void>; testSpeaker: () => Promise<void>;
};

/** Escolha de entrada (microfone) e saída (fone ou alto-falante), com teste de cada uma. */
export function AudioPanel({ devices, onTestMic, micBusy, micNotice, live = false }: {
  devices: Devices; onTestMic?: () => void; micBusy: boolean; micNotice?: string; live?: boolean;
}) {
  const { load } = devices;
  useEffect(() => { void load(); }, [load]);

  return (
    <div className={s.audio} data-live={live || undefined}>
      <div className={s.device}>
        <label htmlFor="mic-select"><Mic />Microfone</label>
        <div className={s.deviceRow}>
          <div className="field">
            <select id="mic-select" value={devices.micId} disabled={devices.busy || !devices.mics.length} onChange={(e) => void devices.chooseMic(e.target.value)}>
              {!devices.mics.length && <option value="">{devices.busy ? "Procurando…" : "Permita o microfone para listar"}</option>}
              {devices.mics.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
          {onTestMic && (
            <button type="button" className={`btn ${s.ghostOnDark}`} onClick={onTestMic} disabled={micBusy}>
              {micBusy ? "Fale agora…" : "Testar"}
            </button>
          )}
        </div>
        {micBusy && <meter className={s.level} min={0} max={1} value={devices.testLevel} aria-label="Nível do microfone no teste" />}
      </div>

      <div className={s.device}>
        <label htmlFor="out-select"><Speaker />Saída de áudio
          {!devices.canPickSpeaker && <Tip side="end">Este navegador usa a saída padrão do sistema. Para escolher aqui, use o Chrome ou o Edge.</Tip>}
        </label>
        <div className={s.deviceRow}>
          <div className="field">
            <select id="out-select" value={devices.speakerId} disabled={!devices.canPickSpeaker || devices.busy || !devices.speakers.length}
                    onChange={(e) => void devices.chooseSpeaker(e.target.value)}>
              {!devices.speakers.length && <option value="">{devices.canPickSpeaker ? "Saída padrão do sistema" : "Padrão do sistema"}</option>}
              {devices.speakers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
          <button type="button" className={`btn ${s.ghostOnDark}`} onClick={() => void devices.testSpeaker()} disabled={devices.speakerTesting}>
            {devices.speakerTesting ? "Tocando…" : "Testar"}
          </button>
        </div>
      </div>
      <p role="status" className={s.audioNote}>{devices.notice || micNotice}</p>
    </div>
  );
}
