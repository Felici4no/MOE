"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { iniciarSimulacao, responder, criarResumo } from "@moe/domain";
import { api, ApiError } from "@/lib/api";
import type { MoeSession } from "@/lib/moe/api";
import { demoScript, sessionScript, POSTURA, TOM, type Script } from "@/lib/moe/script";
import { useOfficeBridge } from "@/lib/moe/useOfficeBridge";
import { VOICE_STATUS } from "@/lib/moe/voice";
import s from "./moe.module.css";

export const AVISO_MOE =
  "Esta é uma simulação fictícia. Suas decisões aqui não comprovam competências profissionais nem determinam oportunidades de carreira.";
const CREDITO = "Visual engine: Pixel Agents — MIT © 2026 Pablo De Lucca";

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

/** Entrada: sem parâmetros, demonstração S01 local; `?cenario=` ou `?sessao=`, cenário da empresa. */
export function MoeExperience() {
  const params = useSearchParams();
  const cenario = params.get("cenario");
  const sessao = params.get("sessao");
  return cenario || sessao ? <CompanyRun cenario={cenario} sessao={sessao} /> : <DemoRun />;
}

/* ------------------------------- Demonstração S01 ------------------------------- */

function DemoRun() {
  const script = useMemo(demoScript, []);
  const [stage, setStage] = useState<"entrada" | "escritorio" | "resultado">("entrada");
  const [sessao, setSessao] = useState(() => iniciarSimulacao("entrega-sob-pressao"));
  const [runId, setRunId] = useState(0);
  const iniciar = useCallback(() => { setSessao(iniciarSimulacao("entrega-sob-pressao")); setRunId((n) => n + 1); setStage("escritorio"); }, []);

  if (stage === "entrada") return <Entrada script={script} onEntrar={iniciar} />;
  if (stage === "resultado") {
    const resumo = criarResumo(sessao);
    return <ResultadoDemo script={script} respostas={resumo.respostas.map((r) => r.citacao)} onRepetir={iniciar} />;
  }
  return (
    <Escritorio key={runId} script={script} respostas={sessao.eventos.map((e) => e.quote)}
      onAnswer={async (texto) => { setSessao(responder(sessao, texto)); }}
      onRecomecar={iniciar} onConcluir={async () => setStage("resultado")} />
  );
}

/* ------------------------------- Cenário da empresa ------------------------------ */

function CompanyRun({ cenario, sessao: sessaoId }: { cenario: string | null; sessao: string | null }) {
  const [session, setSession] = useState<MoeSession | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [entered, setEntered] = useState(false);
  const started = useRef(false);

  const begin = useCallback(async () => {
    setError(null);
    try {
      const s = cenario
        ? await api<MoeSession>("/moe/play/sessions", { body: { scenario_id: cenario } })
        : await api<MoeSession>(`/moe/play/sessions/${encodeURIComponent(sessaoId!)}`);
      setSession(s);
      // Guarda a sessão na URL: recarregar retoma do ponto certo, sem criar outra.
      window.history.replaceState(null, "", `/moe?sessao=${s.id}`);
    } catch (e) {
      setError({ status: e instanceof ApiError ? e.status : 0, message: (e as Error).message });
    }
  }, [cenario, sessaoId]);

  useEffect(() => { if (!started.current) { started.current = true; void begin(); } }, [begin]);

  if (error) {
    return (
      <main className={s.entry} id="conteudo">
        <header className={s.topbar}><Marca /></header>
        <section className={s.entryBody}>
          <h1 className={s.monument}>Não foi possível abrir a simulação.</h1>
          <p className={s.notice} role="alert">{error.status === 401 ? "Entre na sua conta da empresa para jogar este cenário." : error.message}</p>
          <div className={s.actions}>
            {error.status === 401 ? <Link className={s.cta} href="/">Entrar</Link> : <button className={s.cta} onClick={() => void begin()}>Tentar de novo</button>}
            <Link className={s.btn} href="/moe">Ver a demonstração</Link>
          </div>
        </section>
      </main>
    );
  }
  if (!session) {
    return <main className={s.entry} id="conteudo"><header className={s.topbar}><Marca /></header><p className={s.entryBody} role="status">PREPARANDO AMBIENTE…</p></main>;
  }

  const script = sessionScript(session);
  if (session.status === "finished") return <ResultadoEmpresa script={script} session={session} onChange={setSession} />;
  if (!entered && session.answers.length === 0) return <Entrada script={script} onEntrar={() => setEntered(true)} />;

  return (
    <Escritorio script={script} respostas={session.answers.map((a) => a.quote)}
      onAnswer={async (texto) => {
        const scene = session.scenes.find((x) => !x.answered)!;
        setSession(await api<MoeSession>(`/moe/play/sessions/${session.id}/answers`, { body: { scene_id: scene.id, text: texto } }));
      }}
      onConcluir={async () => { setSession(await api<MoeSession>(`/moe/play/sessions/${session.id}/finish`, { method: "POST" })); }} />
  );
}

/* ------------------------------------ Telas ------------------------------------ */

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

function personalidade(p: Script["cast"][number]) {
  return [...p.traits, p.postura ? `postura ${POSTURA[p.postura]}` : ""].filter(Boolean).join(" · ");
}

function Entrada({ script, onEntrar }: { script: Script; onEntrar: () => void }) {
  const ascii = script.cast.map((p) => `[ ${p.nome.toUpperCase()} ]`).join("---");
  const n = script.cast.length;
  return (
    <main className={s.entry} id="conteudo">
      <header className={s.topbar}>
        <Marca />
        <span className={s.tagDemo}>{VOICE_STATUS.label}</span>
      </header>
      <section className={s.entryBody} aria-labelledby="moe-title">
        <p className={s.meta}>OFFICE SIMULATION · {script.codigo} — {script.titulo.toUpperCase()}{script.demo ? "" : " · CENÁRIO DA EMPRESA"}</p>
        <h1 id="moe-title" className={s.monument}>VOCÊ CHEGOU AO ESCRITÓRIO.</h1>
        <p className={s.lede}>{n === 3 ? "Três colegas" : `${n} ${n === 1 ? "pessoa" : "pessoas"}`}. Uma situação. Suas escolhas.</p>
        {script.descricao && !script.demo && <p className={s.small}>{script.descricao}</p>}
        <pre className={s.ascii} aria-hidden="true">{ascii}</pre>
        <ul className={s.cast} aria-label="Personagens">
          {script.cast.map((p, i) => (
            <li key={p.key}>
              <span className={s.meta}>0{i + 1}</span>
              <strong>{p.nome}</strong>
              <span>{p.papel}</span>
              {personalidade(p) && <small className={s.persona}>{personalidade(p)}</small>}
            </li>
          ))}
        </ul>
        <button type="button" className={s.cta} onClick={onEntrar}>ENTRAR NO ESCRITÓRIO</button>
        <p className={s.small}>Entre no escritório. Converse. Decida. Reflita. Cerca de 2 a 3 minutos, por texto.</p>
        <p className={s.notice} role="note">{AVISO_MOE}</p>
        <p className={s.small}>
          {VOICE_STATUS.detalhe}{" "}
          {script.demo
            ? "Suas respostas ficam só neste navegador e não são enviadas a nenhum servidor."
            : "Suas respostas ficam na sua conta. A leitura é sua; a empresa só vê se você decidir compartilhar."}
        </p>
      </section>
      <footer className={s.credit}>{CREDITO}</footer>
    </main>
  );
}

function Escritorio({ script, respostas, onAnswer, onRecomecar, onConcluir }: {
  script: Script;
  respostas: string[];
  onAnswer: (texto: string) => Promise<void>;
  onRecomecar?: () => void;
  onConcluir: () => Promise<void>;
}) {
  const indice = respostas.length;
  const cena = script.cenas[indice] ?? null;
  const [fase, setFase] = useState<Fase>("preparando");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mudo, setMudo] = useState(false);
  const [semEscritorio, setSemEscritorio] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logEndRef = useRef<HTMLLIElement>(null);
  const pessoaDe = useCallback((key: string) => script.cast.find((p) => p.key === key)!, [script]);

  const npcAtual = cena ? cena.npc : null;
  const onNpcClick = useCallback((npc: string) => {
    if (!npcAtual) return;
    setAviso(npc === npcAtual ? null : `Agora é a vez de ${pessoaDe(npcAtual).nome}. ${pessoaDe(npc).nome} fala depois.`);
  }, [npcAtual, pessoaDe]);
  const castMsg = useMemo(() => script.cast.map((p) => ({ key: p.key, name: p.nome, role: p.papel, look: p.look })), [script]);
  const { frameRef, status, send } = useOfficeBridge(castMsg, onNpcClick);
  const ambientePronto = status === "ready" || semEscritorio;

  // Legendas: falas dos personagens e do participante, já ditas, em ordem.
  const legendas = useMemo(() => {
    const linhas: { quem: string; texto: string; participante: boolean }[] = [];
    script.cenas.forEach((c, i) => {
      if (i > indice || (i === indice && fase === "preparando")) return;
      linhas.push({ quem: pessoaDe(c.npc).nome, texto: c.fala, participante: false });
      if (respostas[i] !== undefined) linhas.push({ quem: "Você", texto: respostas[i], participante: true });
    });
    return linhas;
  }, [script, respostas, indice, fase, pessoaDe]);

  // Roteiro de cada cena: um personagem fala por vez, depois escuta.
  useEffect(() => {
    if (!ambientePronto) return;
    if (!cena) { setFase("concluida"); send({ type: "moe:speaking", npc: null }); send({ type: "moe:focus", npc: null }); return; }
    setFase("respondendo");
    send({ type: "moe:focus", npc: cena.npc });
    send({ type: "moe:speaking", npc: cena.npc });
    const ms = prefersReducedMotion() ? 0 : Math.min(2600, 700 + cena.fala.split(" ").length * 60);
    const t = window.setTimeout(() => {
      setFase("ouvindo");
      send({ type: "moe:speaking", npc: null });
      send({ type: "moe:awaiting", npc: cena.npc });
      // Foca sem rolar: no celular o escritório continua à vista.
      inputRef.current?.focus({ preventScroll: true });
    }, ms);
    return () => window.clearTimeout(t);
  }, [ambientePronto, cena, send]);

  useEffect(() => { send({ type: "moe:sound", enabled: !mudo }); }, [mudo, send, status]);
  useEffect(() => { logEndRef.current?.scrollIntoView({ block: "nearest" }); }, [legendas.length]);

  async function enviar(e: React.FormEvent | React.KeyboardEvent) {
    e.preventDefault();
    if (fase !== "ouvindo" || enviando) return;
    if (!texto.trim()) { setErro("Escreva sua resposta antes de enviar."); return; }
    if (texto.length > 2000) { setErro("Sua resposta é longa demais. Resuma em até 2000 caracteres."); return; }
    setEnviando(true);
    try {
      await onAnswer(texto);
      setTexto(""); setErro(null); setAviso(null);
    } catch (err) {
      setErro((err as Error).message || "Não foi possível registrar sua resposta. Tente de novo.");
    } finally { setEnviando(false); }
  }

  async function concluir() {
    setEnviando(true);
    try { await onConcluir(); } catch (err) { setErro((err as Error).message); } finally { setEnviando(false); }
  }

  const pessoa = cena ? pessoaDe(cena.npc) : null;

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
          {onRecomecar && <button type="button" className={s.btn} onClick={onRecomecar}>Recomeçar</button>}
          <Link className={s.btn} href={script.demo ? "/" : "/app/moe"}>Sair</Link>
        </nav>
      </header>

      <div className={s.scenarioBar}>
        <span className={s.meta}>{script.codigo} — {script.titulo.toUpperCase()}</span>
        <span className={s.meta}>CENA {Math.min(indice + 1, script.cenas.length)} / {script.cenas.length}</span>
        <span className={s.tagDemo} title={VOICE_STATUS.detalhe}>{VOICE_STATUS.label}</span>
        <span className={s.tagSim}>SIMULAÇÃO FICTÍCIA</span>
      </div>

      <div className={s.stage}>
        <section className={s.world} aria-label="Escritório">
          {!semEscritorio && (
            <iframe ref={frameRef} className={s.frame} src="/office-engine/index.html"
              title={`Escritório MOE em pixel art, com ${script.cast.map((p) => p.nome).join(", ")}`} referrerPolicy="no-referrer" />
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
              <p className={s.meta}>{fase === "respondendo" ? "RESPONDENDO" : "OUVINDO VOCÊ"} · VOZ: {VOICE_STATUS.label}{pessoa.tomDeVoz ? ` · PERFIL ${TOM[pessoa.tomDeVoz].toUpperCase()}` : ""}</p>
              <h2 className={s.npcName}>{pessoa.nome} <span>· {pessoa.papel}</span></h2>
              {personalidade(pessoa) && <p className={s.persona}>{personalidade(pessoa)}</p>}
              <p className={s.line}>“{cena.fala}”</p>
            </article>
          ) : fase === "concluida" ? (
            <article className={s.npcCard}>
              <p className={s.meta}>SIMULAÇÃO CONCLUÍDA</p>
              <h2 className={s.npcName}>Obrigado por passar no escritório.</h2>
              <button type="button" className={s.cta} disabled={enviando} onClick={() => void concluir()}>{enviando ? "PREPARANDO…" : "VER MINHA DEVOLUTIVA"}</button>
              {erro && <p className={s.error} role="alert">{erro}</p>}
            </article>
          ) : (
            <article className={s.npcCard}><p className={s.meta}>PREPARANDO AMBIENTE</p><p>Arrumando as mesas…</p></article>
          )}

          {aviso && <p className={s.hint} role="status">{aviso}</p>}

          {cena && ambientePronto && (
            <form className={s.answer} onSubmit={enviar} noValidate>
              <label htmlFor={inputId} className={s.meta}>SUA RESPOSTA PARA {pessoa?.nome.toUpperCase()}</label>
              <textarea ref={inputRef} id={inputId} className={s.textarea} rows={3} maxLength={2000} value={texto}
                disabled={fase !== "ouvindo" || enviando} aria-invalid={!!erro} aria-describedby={erro ? `${inputId}-err` : undefined}
                onChange={(e) => { setTexto(e.target.value); if (erro) setErro(null); }}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void enviar(e); }} />
              {erro && <p id={`${inputId}-err`} className={s.error} role="alert">{erro}</p>}
              {cena.alternativas.length > 0 && (
                <div className={s.chips} aria-label="Sugestões para começar">
                  {cena.alternativas.map((a) => (
                    <button key={a} type="button" className={s.chip} disabled={fase !== "ouvindo"} onClick={() => { setTexto(a); inputRef.current?.focus(); }}>{a}</button>
                  ))}
                </div>
              )}
              <button type="submit" className={s.cta} disabled={fase !== "ouvindo" || enviando}>Responder</button>
              <p className={s.small}>Ctrl + Enter também envia.{cena.alternativas.length > 0 ? " As sugestões só preenchem o campo; você pode reescrever." : ""}</p>
            </form>
          )}

          <ol className={s.captions} aria-label="Legendas da conversa">
            {legendas.map((l, i) => (
              <li key={i} className={l.participante ? s.mine : undefined}><span className={s.meta}>{l.quem}</span> {l.texto}</li>
            ))}
            <li ref={logEndRef} aria-hidden="true" />
          </ol>
        </section>
      </div>
      <p className={s.footNotice}>{AVISO_MOE}</p>
    </main>
  );
}

function useFocusHeading() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  return headingRef;
}

function ResultadoDemo({ script, respostas, onRepetir }: { script: Script; respostas: string[]; onRepetir: () => void }) {
  const headingRef = useFocusHeading();
  return (
    <main className={s.result} id="conteudo">
      <header className={s.topbar}><Marca /><span className={s.tagSim}>SIMULAÇÃO FICTÍCIA</span></header>
      <section className={s.resultBody} aria-labelledby="resultado-title">
        <p className={s.meta}>MOE — SIMULAÇÃO · {script.codigo} — {script.titulo.toUpperCase()}</p>
        <h1 id="resultado-title" ref={headingRef} tabIndex={-1} className={s.monument}>Sua experiência no escritório</h1>
        <p className={s.notice} role="note">{AVISO_MOE}</p>
        <ol className={s.quotes}>
          {respostas.map((r, i) => {
            const c = script.cenas[i];
            const p = script.cast.find((x) => x.key === c.npc)!;
            return (
              <li key={c.id}>
                <p className={s.meta}>0{i + 1} · {p.nome.toUpperCase()} · {p.papel.toUpperCase()}</p>
                <p className={s.question}>{c.fala}</p>
                <p className={s.meta}>VOCÊ RESPONDEU (TEXTO LITERAL)</p>
                <blockquote className={s.quote}><mark>{r}</mark></blockquote>
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

function ResultadoEmpresa({ script, session, onChange }: { script: Script; session: MoeSession; onChange: (s: MoeSession) => void }) {
  const headingRef = useFocusHeading();
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const a = session.analysis;

  async function share(next: boolean) {
    setBusy(true); setErro(null);
    try { onChange(await api<MoeSession>(`/moe/play/sessions/${session.id}/share`, { body: { share: next } })); }
    catch (e) { setErro((e as Error).message); }
    finally { setBusy(false); }
  }

  if (session.wellbeing_alert) {
    return (
      <main className={s.result} id="conteudo">
        <header className={s.topbar}><Marca /></header>
        <section className={s.resultBody}>
          <h1 ref={headingRef} tabIndex={-1} className={s.monument}>Obrigado por confiar o que você contou.</h1>
          <p className={s.notice}>Algo que você escreveu merece cuidado de gente. Por isso não geramos a leitura desta simulação e nada será compartilhado com a empresa.</p>
          <p className={s.small}>Se fizer sentido, converse com alguém de confiança, com o RH ou com um profissional de saúde. Em risco de vida, ligue para o <strong>CVV — 188</strong> (gratuito, 24 horas).</p>
          <div className={s.actions}><Link className={s.btn} href="/app/moe">Sair</Link></div>
        </section>
      </main>
    );
  }

  return (
    <main className={s.result} id="conteudo">
      <header className={s.topbar}><Marca /><span className={s.tagSim}>SIMULAÇÃO FICTÍCIA</span></header>
      <section className={s.resultBody} aria-labelledby="resultado-title">
        <p className={s.meta}>MOE — SIMULAÇÃO · {script.titulo.toUpperCase()} · {script.codigo}</p>
        <h1 id="resultado-title" ref={headingRef} tabIndex={-1} className={s.monument}>Sua experiência no escritório</h1>
        <p className={s.notice} role="note">{a?.notice ?? AVISO_MOE}</p>

        <h2 className={s.sectionTitle}>Pontos que a empresa quis explorar</h2>
        <p className={s.small}>{a?.method === "llm"
          ? "Leitura automática conferida: só aparecem trechos que estão literalmente nas suas respostas."
          : "Suas respostas agrupadas pelos pontos de cada cena, sem interpretação automática."}</p>
        <ol className={s.quotes}>
          {a?.points.map((p) => (
            <li key={p.point_id}>
              <p className={s.meta}>{p.name.toUpperCase()} · FOCO {p.weight}/5</p>
              {p.signals.length > 0 && <p className={s.question}>Sinais que apareceram: {p.signals.join(" · ")}</p>}
              {p.quotes.length ? p.quotes.map((q) => <blockquote key={q} className={s.quote}><mark>{q}</mark></blockquote>)
                : <p className={s.question}>{p.note}</p>}
            </li>
          ))}
        </ol>

        <div className={s.consent} role="group" aria-labelledby="consent-title">
          <p id="consent-title" className={s.meta}>COMPARTILHAR COM A EMPRESA</p>
          {session.share_with_tenant ? (
            <>
              <p role="status"><strong>Compartilhado.</strong> A empresa vê esta leitura e suas respostas desta simulação. Você pode desfazer quando quiser.</p>
              <button className={s.btn} disabled={busy} onClick={() => void share(false)}>Deixar de compartilhar</button>
            </>
          ) : (
            <>
              <p>Esta leitura é sua. A empresa só vê se você autorizar, e você pode desfazer depois.</p>
              <button className={s.cta} disabled={busy} onClick={() => void share(true)}>Compartilhar com a empresa</button>
            </>
          )}
          {erro && <p className={s.error} role="alert">{erro}</p>}
        </div>

        <div className={s.separate} role="note">
          <p className={s.meta}>MOE — SIMULAÇÃO ≠ MAPA DE TALENTOS — HISTÓRIAS REAIS</p>
          <p>Estas respostas não viram evidências de talento no seu Mapa e não recebem nota.</p>
        </div>
        <div className={s.actions}><Link className={s.btn} href="/app/moe">Sair</Link></div>
      </section>
      <footer className={s.credit}>{CREDITO}</footer>
    </main>
  );
}
