"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseOfficeMessage, type HostCommand, type MoeNpc } from "@moe/protocol";

export type OfficeStatus = "loading" | "ready" | "failed";

/** Ponte host → escritório (iframe de mesma origem). Valida origem, remetente e esquema. */
export function useOfficeBridge(onNpcClick: (npc: MoeNpc) => void, timeoutMs = 20000) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<OfficeStatus>("loading");
  const [npcs, setNpcs] = useState<MoeNpc[]>([]);
  const clickRef = useRef(onNpcClick);
  useEffect(() => { clickRef.current = onNpcClick; });

  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return;
      const msg = parseOfficeMessage(e.data);
      if (!msg) return;
      if (msg.type === "moe:ready") { setNpcs(msg.npcs); setStatus(msg.npcs.length === 3 ? "ready" : "failed"); }
      else if (msg.type === "moe:error") setStatus("failed");
      else if (msg.type === "moe:npcClick") clickRef.current(msg.npc);
    };
    window.addEventListener("message", listener);
    const timer = window.setTimeout(() => setStatus((s) => (s === "loading" ? "failed" : s)), timeoutMs);
    return () => { window.removeEventListener("message", listener); window.clearTimeout(timer); };
  }, [timeoutMs]);

  const send = useCallback((msg: HostCommand) => {
    const win = frameRef.current?.contentWindow;
    if (win) win.postMessage({ source: "moe-host", ...msg }, window.location.origin);
  }, []);

  return { frameRef, status, npcs, send };
}
