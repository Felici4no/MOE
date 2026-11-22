"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { MoeNpc } from "@moe/protocol";
import { iniciarSimulacao, obterCena, responder, criarResumo, type Sessao } from "@moe/domain";
import { CENARIOS, PERSONAGENS } from "@moe/scenarios";
import { useOfficeBridge } from "@/lib/moe/useOfficeBridge";
import { VOICE_STATUS } from "@/lib/moe/voice";
import s from "./moe.module.css";

const CENARIO_ID = "entrega-sob-pressao";
const CENARIO = CENARIOS[CENARIO_ID];
export const AVISO_MOE =
  "Esta é uma simulação fictícia. Suas decisões aqui não comprovam competências profissionais nem determinam oportunidades de carreira.";
const CREDITO = "Visual engine: Pixel Agents — MIT © 2026 Pablo De Lucca";

type Stage = "entrada" | "escritorio" | "resultado";
type Fase = "preparando" | "respondendo" | "ouvindo" | "concluida";
const FASE_LABEL: Record<Fase, string> = {
  preparando: "PREPARANDO AMBIENTE",
  respondendo: "RESPONDENDO",
  ouvindo: "OUVINDO",
  concluida: "SIMULAÇÃO CONCLUÍDA",
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MoeExperience() {
  const [stage, setStage] = useState<Stage>("entrada");
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [runId, setRunId] = useState(0);

  const iniciar = useCallback(() => {
    setSessao(iniciarSimulacao(CENARIO_ID));
    setRunId((n) => n + 1);
    setStage("escritorio");
  }, []);

  if (stage === "entrada") return <Entrada onEntrar={iniciar} />;
  if (stage === "resultado" && sessao) {
    return <Resultado sessao={sessao} onRepetir={iniciar} />;
  }
  return sessao ? (
    <Escritorio
      key={runId}
      sessao={sessao}
      setSessao={setSessao}
      onRecomecar={iniciar}
      onConcluir={() => setStage("resultado")}
    />
  ) : null;
}

/* ------------------------------------------------------------------------- */

function Marca() {
  return (
    <div className={s.brand}>
      <span className={s.logo} aria-hidden="true">MOE</span>
      <span className={s.brandText}>
        <span className={s.meta}>MOE / EXPERIENCE 001</span>
        <span className={s.brandName}>MY OFFICE EXPERIENCE</span>
      </span>
    </div>
  );
}

function Entrada({ onEntrar }: { onEntrar: () => void }) {
  return (
    <main className={s.entry} id="conteudo">
      <header className={s.topbar}>
        <Marca />
        <span className={s.tagDemo}>{VOICE_STATUS.label}</span>
      </header>
      <section className={s.entryBody} aria-labelledby="moe-title">
        <p className={s.meta}>OFFICE SIMULATION · {CENARIO.codigo} — {CENARIO.titulo.toUpperCase()}</p>
        <h1 id="moe-title" className={s.monument}>VOCÊ CHEGOU AO ESCRITÓRIO.</h1>
        <p className={s.lede}>Três colegas. Uma situação. Suas escolhas.</p>
        <pre className={s.ascii} aria-hidden="true">{"+--------+   +--------+   +--------+\n|  MAIA  |---|  LÉO   |---|  NARA  |\n+--------+   +--------+   +--------+"}</pre>
        <ul className={s.cast} aria-label="Personagens">
          {(["maia", "leo", "nara"] as const).map((id, i) => (
            <li key={id}>
              <span className={s.meta}>0{i + 1}</span>
              <strong>{PERSONAGENS[id].nome}</strong>
              <span>{PERSONAGENS[id].funcao}</span>
            </li>
          ))}
        </ul>
        <button type="button" className={s.cta} onClick={onEntrar}>ENTRAR NO ESCRITÓRIO</button>
        <p className={s.small}>Entre no escritório. Converse. Decida. Reflita. Cerca de 2 a 3 minutos, por texto.</p>
        <p className={s.notice} role="note">{AVISO_MOE}</p>
        <p className={s.small}>{VOICE_STATUS.detalhe} Suas respostas ficam só neste navegador e não são enviadas a nenhum servidor.</p>
      </section>
      <footer className={s.credit}>{CREDITO}</footer>
    </main>
  );
}

/* ------------------------------------------------------------------------- */

function Escritorio({ sessao, setSessao, onRecomecar, onConcluir }: {
  sessao: Sessao;
  setSessao: (s: Sessao) => void;
  onRecomecar: () => void;
  onConcluir: () => void;
}) {
  const cena = obterCena(sessao);
  const [fase, setFase] = useState<Fase>("preparando");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mudo, setMudo] = useState(false);
  const [semEscritorio, setSemEscritorio] = useState(false);
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logEndRef = useRef<HTMLLIElement>(null);

  const npcAtual: MoeNpc | null = cena ? cena.npcId : null;
  const onNpcClick = useCallback((npc: MoeNpc) => {
    if (!npcAtual) return;
    setAviso(npc === npcAtual ? null : `Agora é a vez de ${PERSONAGENS[npcAtual].nome}. ${PERSONAGENS[npc].nome} fala depois.`);
  }, [npcAtual]);
  const { frameRef, status, send } = useOfficeBridge(onNpcClick);
  const ambientePronto = status === "ready" || semEscritorio;

  // Legendas: falas dos NPCs e do participante, já ditas, em ordem.
  const legendas = useMemo(() => {
    const linhas: { quem: string; texto: string; participante: boolean }[] = [];
    CENARIO.cenas.forEach((c, i) => {
      if (i > sessao.indiceCena || (i === sessao.indiceCena && fase === "preparando")) return;
      linhas.push({ quem: PERSONAGENS[c.npcId].nome, texto: c.fala, participante: false });
      const r = sessao.eventos[i];
      if (r) linhas.push({ quem: "Você", texto: r.quote, participante: true });
    });
    return linhas;
  }, [sessao, fase]);

  // Roteiro de cada cena: um personagem fala por vez, depois escuta.
  useEffect(() => {
    if (!ambientePronto) return;
    if (!cena) { setFase("concluida"); send({ type: "moe:speaking", npc: null }); send({ type: "moe:focus", npc: null }); return; }
    setFase("respondendo");
    send({ type: "moe:focus", npc: cena.npcId });
    send({ type: "moe:speaking", npc: cena.npcId });
    const ms = prefersReducedMotion() ? 0 : Math.min(2600, 700 + cena.fala.split(" ").length * 60);
    const t = window.setTimeout(() => {
      setFase("ouvindo");
      send({ type: "moe:speaking", npc: null });
      send({ type: "moe:awaiting", npc: cena.npcId });
      // Foca sem rolar: no celular o escritório continua à vista.
      inputRef.current?.focus({ preventScroll: true });
    }, ms);
    return () => window.clearTimeout(t);
  }, [ambientePronto, cena, send]);

  useEffect(() => { send({ type: "moe:sound", enabled: !mudo }); }, [mudo, send, status]);
  useEffect(() => { logEndRef.current?.scrollIntoView({ block: "nearest" }); }, [legendas.length]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (fase !== "ouvindo") return;
    try {
      setSessao(responder(sessao, texto));
      setTexto("");
      setErro(null);
      setAviso(null);
    } catch {
      setErro(texto.trim() ? "Sua resposta é longa demais. Resuma em até 2000 caracteres." : "Escreva sua resposta antes de enviar.");
    }
  }

  const pessoa = cena ? PERSONAGENS[cena.npcId] : null;

  return (
    <main className={s.office} id="conteudo">
      <header className={s.topbar}>
        <Marca />
        <p className={s.status} role="status" aria-live="polite">
          <span className={fase === "ouvindo" || fase === "respondendo" ? s.blink : undefined} aria-hidden="true">■</span>{" "}
          {ambientePronto ? FASE_LABEL[fase] : FASE_LABEL.preparando}
        </p>
        <nav className={s.controls} aria-label="Controles da simulação">
          <button type="button" className={s.btn} aria-pressed={mudo} onClick={() => setMudo((m) => !m)}>{mudo ? "Som desligado" : "Silenciar"}</button>
          <button type="button" className={s.btn} onClick={onRecomecar}>Recomeçar</button>
          <Link className={s.btn} href="/">Sair</Link>
        </nav>
      </header>

      <div className={s.scenarioBar}>
        <span className={s.meta}>{CENARIO.codigo} — {CENARIO.titulo.toUpperCase()}</span>
        <span className={s.meta}>CENA {Math.min(sessao.indiceCena + 1, 3)} / 3</span>
        <span className={s.tagDemo} title={VOICE_STATUS.detalhe}>{VOICE_STATUS.label}</span>
        <span className={s.tagSim}>SIMULAÇÃO FICTÍCIA</span>
      </div>

      <div className={s.stage}>
        <section className={s.world} aria-label="Escritório">
          {!semEscritorio && (
            <iframe
              ref={frameRef}
              className={s.frame}
              src="/office-engine/index.html"
              title="Escritório MOE em pixel art, com Maia, Léo e Nara"
              referrerPolicy="no-referrer"
            />
          )}
          {status === "loading" && !semEscritorio && <div className={s.overlay} aria-hidden="true">PREPARANDO AMBIENTE…</div>}
          {status === "failed" && !semEscritorio && (
            <div className={s.overlay} role="alert">
              <p>Não foi possível carregar o escritório 2D.</p>
              <button type="button" className={s.btn} onClick={() => setSemEscritorio(true)}>Continuar só com texto</button>
              <button type="button" className={s.btn} onClick={() => window.location.reload()}>Tentar de novo</button>
            </div>
          )}
          {semEscritorio && <div className={s.overlay}>Modo texto: o escritório 2D não está disponível agora.</div>}
          <p className={s.creditInline}>{CREDITO}</p>
        </section>

        <section className={s.dialog} aria-label="Conversa">
          {pessoa && cena && ambientePronto ? (
            <article className={s.npcCard} aria-live="polite">
              <p className={s.meta}>{fase === "respondendo" ? "RESPONDENDO" : "OUVINDO VOCÊ"} · VOZ: {VOICE_STATUS.label}</p>
              <h2 className={s.npcName}>{pessoa.nome} <span>· {pessoa.funcao}</span></h2>
              <p className={s.line}>“{cena.fala}”</p>
            </article>
          ) : fase === "concluida" ? (
            <article className={s.npcCard}>
              <p className={s.meta}>SIMULAÇÃO CONCLUÍDA</p>
              <h2 className={s.npcName}>Obrigado por passar no escritório.</h2>
              <button type="button" className={s.cta} onClick={onConcluir}>VER MINHA DEVOLUTIVA</button>
            </article>
          ) : (
            <article className={s.npcCard}><p className={s.meta}>PREPARANDO AMBIENTE</p><p>Arrumando as mesas…</p></article>
          )}

          {aviso && <p className={s.hint} role="status">{aviso}</p>}

          {cena && ambientePronto && (
            <form className={s.answer} onSubmit={enviar} noValidate>
              <label htmlFor={inputId} className={s.meta}>SUA RESPOSTA PARA {pessoa?.nome.toUpperCase()}</label>
              <textarea
                ref={inputRef}
                id={inputId}
                className={s.textarea}
                rows={3}
                maxLength={2000}
                value={texto}
                disabled={fase !== "ouvindo"}
                aria-invalid={!!erro}
                aria-describedby={erro ? `${inputId}-err` : undefined}
                onChange={(e) => { setTexto(e.target.value); if (erro) setErro(null); }}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) enviar(e); }}
              />
              {erro && <p id={`${inputId}-err`} className={s.error} role="alert">{erro}</p>}
              <div className={s.chips} aria-label="Sugestões para começar">
                {cena.alternativas.map((a) => (
                  <button key={a} type="button" className={s.chip} disabled={fase !== "ouvindo"} onClick={() => { setTexto(a); inputRef.current?.focus(); }}>{a}</button>
                ))}
              </div>
              <button type="submit" className={s.cta} disabled={fase !== "ouvindo"}>Responder</button>
              <p className={s.small}>Ctrl + Enter também envia. As sugestões só preenchem o campo; você pode reescrever.</p>
            </form>
          )}

          <ol className={s.captions} aria-label="Legendas da conversa">
            {legendas.map((l, i) => (
              <li key={i} className={l.participante ? s.mine : undefined}>
                <span className={s.meta}>{l.quem}</span> {l.texto}
              </li>
            ))}
            <li ref={logEndRef} aria-hidden="true" />
          </ol>
        </section>
      </div>
      <p className={s.footNotice}>{AVISO_MOE}</p>
    </main>
  );
}

/* ------------------------------------------------------------------------- */

function Resultado({ sessao, onRepetir }: { sessao: Sessao; onRepetir: () => void }) {
  const resumo = criarResumo(sessao);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  return (
    <main className={s.result} id="conteudo">
      <header className={s.topbar}>
        <Marca />
        <span className={s.tagSim}>SIMULAÇÃO FICTÍCIA</span>
      </header>
      <section className={s.resultBody} aria-labelledby="resultado-title">
        <p className={s.meta}>MOE — SIMULAÇÃO · {CENARIO.codigo} — {CENARIO.titulo.toUpperCase()}</p>
        <h1 id="resultado-title" ref={headingRef} tabIndex={-1} className={s.monument}>Sua experiência no escritório</h1>
        <p className={s.notice} role="note">{AVISO_MOE}</p>
        <ol className={s.quotes}>
          {resumo.respostas.map((r, i) => {
            const c = CENARIO.cenas.find((x) => x.id === r.cena)!;
            const p = PERSONAGENS[c.npcId];
            return (
              <li key={r.cena}>
                <p className={s.meta}>0{i + 1} · {p.nome.toUpperCase()} · {p.funcao.toUpperCase()}</p>
                <p className={s.question}>{c.fala}</p>
                <p className={s.meta}>VOCÊ RESPONDEU (TEXTO LITERAL)</p>
                <blockquote className={s.quote}><mark>{r.citacao}</mark></blockquote>
              </li>
            );
          })}
        </ol>
        <div className={s.separate} role="note">
          <p className={s.meta}>MOE — SIMULAÇÃO ≠ MAPA DE TALENTOS — HISTÓRIAS REAIS</p>
          <p>Estas respostas não viram evidências de talento, não recebem nota e não são enviadas a nenhuma empresa. Nada aqui foi salvo em servidor.</p>
        </div>
        <div className={s.actions}>
          <button type="button" className={s.cta} onClick={onRepetir}>Repetir</button>
          <Link className={s.btn} href="/">Sair</Link>
        </div>
      </section>
      <footer className={s.credit}>{CREDITO}</footer>
    </main>
  );
}
