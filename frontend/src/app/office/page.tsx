"use client";

import Link from "next/link";
import { useState } from "react";

export default function OfficeExperience() {
  const [ready, setReady] = useState(false);
  return (
    <main style={{ minHeight: "100dvh", background: "var(--ground, #f5f2e9)", color: "var(--ink, #111)", padding: "clamp(16px, 3vw, 48px)" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, borderBottom: "2px solid currentColor", paddingBottom: 18, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: ".12em" }}>MAPA DE TALENTOS / EXPERIMENT 002</p>
          <h1 style={{ fontSize: "clamp(32px, 6vw, 76px)", letterSpacing: "-.06em", lineHeight: 1.06, margin: "8px 0 0" }}>OFFICE EXPERIENCE</h1>
        </div>
        <Link href="/app" style={{ border: "2px solid currentColor", padding: "12px 18px", fontWeight: 700 }}>SAIR ↗</Link>
      </header>
      <section aria-label="Escritório virtual" style={{ display: "grid", gap: 12, marginTop: 22 }}>
        <p style={{ maxWidth: 760 }}>Uma experiência exploratória de situações profissionais. O ambiente visual abaixo reutiliza o motor open-source Pixel Agents. As conversas com personagens e sua ligação ao relatório ainda estão em desenvolvimento.</p>
        <div style={{ border: "2px solid currentColor", boxShadow: "8px 8px 0 #111", background: "#1e1e2e", position: "relative", height: "min(72vh, 720px)", minHeight: 400 }}>
          {!ready && (
            <div aria-live="polite" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#f5f2e9", fontFamily: "monospace", padding: 20, textAlign: "center" }}>
              AMBIENTE VISUAL / PIXEL AGENTS
            </div>
          )}
          <iframe
            title="Visualização de escritório Pixel Agents"
            src="/office-engine/index.html"
            onLoad={() => setReady(true)}
            style={{ width: "100%", height: "100%", border: 0, position: "relative" }}
          />
        </div>
        <small style={{ opacity: .75, fontFamily: "monospace" }}>
          IMPLEMENTAÇÃO VISUAL: PIXEL AGENTS (MIT) / PABLO DE LUCCA •
          MODO DE DESENVOLVIMENTO, NÃO UMA AVALIAÇÃO PROFISSIONAL
        </small>
        <p style={{ fontSize: 13, maxWidth: 740 }}>
          Caso apareça um erro 404 no escritório, execute o build de assets descrito em <code>docs/pixel-agents-integration.md</code>.
          A rota preserva o layout do app, mas não simula chamadas de voz nem entrevistas reais.
        </p>
      </section>
    </main>
  );
}
