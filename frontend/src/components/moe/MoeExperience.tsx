"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { iniciarSimulacao, responder, criarResumo } from "@moe/domain";
import { api, ApiError, type Axis, type Fit } from "@/lib/api";
import type { MoeSession } from "@/lib/moe/api";
import { demoScript, sessionScript, POSTURA, type Script } from "@/lib/moe/script";
import { useOfficeBridge } from "@/lib/moe/useOfficeBridge";
import { VOICE_STATUS } from "@/lib/moe/voice";
import { Wordmark } from "@/components/Wordmark";
import { Tip } from "@/components/Tip";
import s from "./moe.module.css";

export const AVISO_MOE =
  "Esta é uma simulação fictícia. Suas decisões aqui não comprovam competências profissionais nem determinam oportunidades de carreira.";
const CREDITO = "Escritório em pixel art: Pixel Agents, MIT © 2026 Pablo De Lucca";

type Fase = "preparando" | "respondendo" | "ouvindo" | "concluida";
const FASE_LABEL: Record<Fase, string> = {
  preparando: "Preparando o escritório",
  respondendo: "Falando",
  ouvindo: "Sua vez",
  concluida: "Conversas concluídas",
};
const AVISO_VAGA =
  "Simulação fictícia usada nesta vaga. A nota de fit organiza a conversa do RH e sempre mostra suas frases como evidência; não decide a contratação sozinha.";
const AXIS: Record<Axis, string> = { culture: "Cultura", profile: "Perfil", soft_skills: "Soft skills", hard_skills: "Hard skills" };

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
      const x = cenario
        ? await api<MoeSession>("/moe/play/sessions", { body: { scenario_id: cenario } })
        : await api<MoeSession>(`/moe/play/sessions/${encodeURIComponent(sessaoId!)}`);
      setSession(x);
      // Guarda a sessão na URL: recarregar retoma do ponto certo, sem criar outra.
      window.history.replaceState(null, "", `/moe?sessao=${x.id}`);
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
          <h1 className={s.title}>Não foi possível abrir a simulação</h1>
          <p className={s.notice} role="alert">{error.status === 401 ? "Entre na sua conta para jogar este cenário." : error.message}</p>
          <div className={s.actions}>
            {error.status === 401 ? <Link className="btn btn-primary btn-lg" href="/entrar">Entrar</Link> : <button className="btn btn-primary btn-lg" onClick={() => void begin()}>Tentar de novo</button>}
            <Link className="btn btn-lg" href="/moe">Ver a demonstração</Link>
          </div>
        </section>
      </main>
    );
  }
  if (!session) {
    return <main className={s.entry} id="conteudo"><header className={s.topbar}><Marca /></header><p className={s.entryBody} role="status">Preparando o escritório…</p></main>;
  }

  const script = sessionScript(session);
  if (session.status === "finished") return <ResultadoEmpresa script={script} session={session} onChange={setSession} />;
  if (!entered && session.answers.length === 0) return <Entrada script={script} onEntrar={() => setEntered(true)} />;

  return (
    <Escritorio script={script} respostas={session.answers.map((a) => a.quote)}
      onAnswer={async (texto) => {
        const cur = session.current;
        if (!cur) return;
        setSession(await api<MoeSession>(`/moe/play/sessions/${session.id}/answers`, { body: { ...cur, text: texto } }));
      }}
      onConcluir={async () => { setSession(await api<MoeSession>(`/moe/play/sessions/${session.id}/finish`, { method: "POST" })); }} />
  );
}

/* ------------------------------------ Telas ------------------------------------ */

function Marca() {
  return (
    <Link href="/" className={s.brand} aria-label="Resona, início">
      <Wordmark />
      <span className={s.brandSub}>Simulação no escritório</span>
    </Link>
  );
}

function personalidade(p: Script["cast"][number]) {
  return [...p.traits, p.postura ? `postura ${POSTURA[p.postura]}` : ""].filter(Boolean).join(" · ");
}

/** Etapas da simulação (ex.: time de devs → gerência → diretoria), com a atual marcada. */
function Etapas({ etapas, atual }: { etapas: string[]; atual: string | null | "inicio" }) {
  if (etapas.length < 2) return null;
  const idx = atual === "inicio" ? -1 : atual ? etapas.indexOf(atual) : etapas.length;
  return (
    <ol className={s.steps} aria-label="Etapas da simulação">
      {etapas.map((e, i) => (
        <li key={e} data-state={i < idx ? "done" : i === idx ? "now" : "next"} aria-current={i === idx ? "step" : undefined}>
          <span aria-hidden>{i + 1}</span>{e}
        </li>
      ))}
    </ol>
  );
}

function Entrada({ script, onEntrar }: { script: Script; onEntrar: () => void }) {
  const n = script.cast.length;
  return (
    <main className={s.entry} id="conteudo">
      <header className={s.topbar}>
        <Marca />
        <span className={s.badge} title={VOICE_STATUS.detalhe}>Por texto</span>
      </header>
      <section className={s.entryBody} aria-labelledby="moe-title">
        <span className="eyebrow">{script.vaga ? `Vaga · ${script.vaga}` : script.demo ? `Demonstração · ${script.titulo}` : `Cenário da empresa · ${script.titulo}`}</span>
        <h1 id="moe-title" className={s.title}>Você chegou ao escritório</h1>
        <p className={s.lede}>{script.descricao || `${n} ${n === 1 ? "pessoa" : "pessoas"}, uma situação, suas escolhas.`}</p>
        {script.etapas.length > 1 ? (
          <ol className={s.levels} aria-label="Com quem você vai conversar">
            {script.etapas.map((etapa, i) => (
              <li key={etapa}>
                <span className={s.levelName}><span aria-hidden>{i + 1}</span>{etapa}</span>
                <ul className={s.levelCast}>
                  {script.cast.filter((p) => script.etapaDe[p.key] === etapa).map((p) => (
                    <li key={p.key}>
                      <span className={s.avatar} aria-hidden>{p.nome[0]}</span>
                      <span><strong>{p.nome}</strong><span className={s.role}>{p.papel}</span>
                        {personalidade(p) && <small className={s.persona}>{personalidade(p)}</small>}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        ) : (
          <ul className={s.cast} aria-label="Personagens">
            {script.cast.map((p) => (
              <li key={p.key}>
                <span className={s.avatar} aria-hidden>{p.nome[0]}</span>
                <span><strong>{p.nome}</strong><span className={s.role}>{p.papel}</span>
                  {personalidade(p) && <small className={s.persona}>{personalidade(p)}</small>}</span>
              </li>
            ))}
          </ul>
        )}
        <div className={s.actions}>
          <button type="button" className="btn btn-primary btn-lg" onClick={onEntrar}>Entrar no escritório</button>
          <span className={s.small}>Cerca de {Math.max(2, Math.round(script.total * 0.8))} minutos
            <Tip>{script.demo
              ? "Suas respostas ficam só neste navegador e não são enviadas a nenhum servidor."
              : "Os personagens lembram o que você disse e aprofundam. A leitura é sua; a empresa vê a análise da vaga porque você autorizou ao aceitar o convite, e dá para retirar depois."}</Tip>
          </span>
        </div>
        <p className={s.notice} role="note">{AVISO_MOE}</p>
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
  const fim = indice >= script.total;

  // Legendas: falas dos personagens e do participante, já ditas, em ordem.
  const legendas = useMemo(() => {
    const linhas: { quem: string; texto: string; participante: boolean; etapa: string }[] = [];
    script.cenas.forEach((c, i) => {
      // Só trocas completas: a fala em aberto já está no cartão do personagem.
      if (respostas[i] === undefined) return;
      linhas.push({ quem: pessoaDe(c.npc).nome, texto: c.fala, participante: false, etapa: c.etapa });
      linhas.push({ quem: "Você", texto: respostas[i], participante: true, etapa: c.etapa });
    });
    return linhas;
  }, [script, respostas, indice, fase, pessoaDe]);

  // Uma voz por vez: o personagem fala, depois escuta.
  const chave = cena ? `${cena.id}:${cena.turn}` : fim ? "fim" : "espera";
  useEffect(() => {
    if (!ambientePronto) return;
    if (!cena) {
      if (fim) { setFase("concluida"); send({ type: "moe:speaking", npc: null }); send({ type: "moe:focus", npc: null }); }
      return;
    }
    setFase("respondendo");
    send({ type: "moe:focus", npc: cena.npc });
    send({ type: "moe:speaking", npc: cena.npc });
    const ms = prefersReducedMotion() ? 0 : Math.min(2600, 700 + cena.fala.split(" ").length * 50);
    const t = window.setTimeout(() => {
      setFase("ouvindo");
      send({ type: "moe:speaking", npc: null });
      send({ type: "moe:awaiting", npc: cena.npc });
      inputRef.current?.focus({ preventScroll: true });
    }, ms);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambientePronto, chave, send]);

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
  const origem = cena?.origem === "memoria" ? "Lembrou da conversa anterior" : cena && cena.turn > 0 ? "Aprofundando" : null;

  return (
    <main className={s.office} id="conteudo">
      <header className={s.topbar}>
        <Marca />
        <p className={s.status} role="status" aria-live="polite">
          <span className={s.dot} data-on={fase === "ouvindo" || fase === "respondendo" || undefined} aria-hidden="true" />
          {ambientePronto ? FASE_LABEL[fase] : FASE_LABEL.preparando}
        </p>
        <nav className={s.controls} aria-label="Controles da simulação">
          <button type="button" className="btn btn-sm" aria-pressed={mudo} onClick={() => setMudo((m) => !m)}>{mudo ? "Som desligado" : "Silenciar"}</button>
          {onRecomecar && <button type="button" className="btn btn-sm" onClick={onRecomecar}>Recomeçar</button>}
          <Link className="btn btn-sm btn-ghost" href={script.demo ? "/" : "/app"}>Sair</Link>
        </nav>
      </header>

      <div className={s.scenarioBar}>
        <div>
          <span className={s.scenarioTitle}>{script.vaga ?? script.titulo}</span>
          <span className={s.small}>{Math.min(indice + 1, script.total)} de {script.total} respostas</span>
        </div>
        <Etapas etapas={script.etapas} atual={cena?.etapa || (fim ? null : script.etapas[0] ?? null)} />
        <span className={s.badge}>Simulação fictícia</span>
      </div>

      <div className={s.stage}>
        <section className={s.world} aria-label="Escritório">
          {!semEscritorio && (
            <iframe ref={frameRef} className={s.frame} src="/office-engine/index.html"
              title={`Escritório em pixel art, com ${script.cast.map((p) => p.nome).join(", ")}`} referrerPolicy="no-referrer" />
          )}
          {status === "loading" && !semEscritorio && <div className={s.overlay} aria-hidden="true">Preparando o escritório…</div>}
          {status === "failed" && !semEscritorio && (
            <div className={s.overlay} role="alert">
              <p>Não foi possível carregar o escritório 2D.</p>
              <button type="button" className="btn btn-sm" onClick={() => setSemEscritorio(true)}>Continuar só com texto</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => window.location.reload()}>Tentar de novo</button>
            </div>
          )}
          {semEscritorio && <div className={s.overlay}>Modo texto: o escritório 2D não está disponível agora.</div>}
          <p className={s.creditInline}>{CREDITO}</p>
        </section>

        <section className={s.dialog} aria-label="Conversa">
          {pessoa && cena && ambientePronto ? (
            <article className={s.npcCard} aria-live="polite">
              <div className={s.npcHead}>
                <span className={s.avatar} aria-hidden>{pessoa.nome[0]}</span>
                <h2 className={s.npcName}>{pessoa.nome} <span>· {pessoa.papel}</span></h2>
                {personalidade(pessoa) && <Tip side="end">{personalidade(pessoa)}</Tip>}
              </div>
              {origem && <span className={s.origin} data-kind={cena.origem === "memoria" ? "memoria" : "aprofunda"}>{origem}</span>}
              <p className={s.line}>{cena.fala}</p>
            </article>
          ) : fase === "concluida" ? (
            <article className={s.npcCard}>
              <h2 className={s.npcName}>Obrigado por passar no escritório</h2>
              <p className={s.small}>Sua leitura junta o que você disse a cada pessoa e o que isso mostra.</p>
              <button type="button" className="btn btn-primary btn-lg" disabled={enviando} onClick={() => void concluir()}>{enviando ? "Preparando…" : "Ver minha leitura"}</button>
              {erro && <p className="alert alert-error" role="alert">{erro}</p>}
            </article>
          ) : (
            <article className={s.npcCard}><p className={s.small}>Arrumando as mesas…</p></article>
          )}

          {aviso && <p className={s.hint} role="status">{aviso}</p>}

          {cena && ambientePronto && (
            <form className={s.answer} onSubmit={enviar} noValidate>
              <label htmlFor={inputId} className="label">Sua resposta para {pessoa?.nome}</label>
              <textarea ref={inputRef} id={inputId} className={s.textarea} rows={3} maxLength={2000} value={texto}
                disabled={fase !== "ouvindo" || enviando} aria-invalid={!!erro} aria-describedby={erro ? `${inputId}-err` : undefined}
                onChange={(e) => { setTexto(e.target.value); if (erro) setErro(null); }}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void enviar(e); }} />
              {erro && <p id={`${inputId}-err`} className="alert alert-error" role="alert">{erro}</p>}
              {cena.alternativas.length > 0 && (
                <div className={s.chips} aria-label="Sugestões para começar">
                  {cena.alternativas.map((a) => (
                    <button key={a} type="button" className="chip" disabled={fase !== "ouvindo"} onClick={() => { setTexto(a); inputRef.current?.focus(); }}>{a}</button>
                  ))}
                </div>
              )}
              <div className={s.answerFoot}>
                <button type="submit" className="btn btn-primary" disabled={fase !== "ouvindo" || enviando}>{enviando ? <span className="spinner" aria-hidden /> : null}Responder</button>
                <span className={s.small}>Ctrl + Enter também envia</span>
              </div>
            </form>
          )}

          <ol className={s.captions} aria-label="Legendas da conversa">
            {legendas.map((l, i) => (
              <li key={i} data-me={l.participante || undefined}><b>{l.quem}</b> {l.texto}</li>
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
      <header className={s.topbar}><Marca /><span className={s.badge}>Simulação fictícia</span></header>
      <section className={s.resultBody} aria-labelledby="resultado-title">
        <span className="eyebrow">Demonstração · {script.titulo}</span>
        <h1 id="resultado-title" ref={headingRef} tabIndex={-1} className={s.title}>Sua experiência no escritório</h1>
        <p className={s.notice} role="note">{AVISO_MOE}</p>
        <ol className={s.convList}>
          {respostas.map((r, i) => {
            const c = script.cenas[i];
            const p = script.cast.find((x) => x.key === c.npc)!;
            return (
              <li key={c.id} className={s.conv}>
                <p className={s.convWho}><span className={s.avatar} aria-hidden>{p.nome[0]}</span><b>{p.nome}</b> · {p.papel}</p>
                <p className={s.convNpc}>{c.fala}</p>
                <blockquote className={s.quote}>{r}</blockquote>
              </li>
            );
          })}
        </ol>
        <p className={s.small}>Estas respostas não recebem nota e não são enviadas a nenhuma empresa. Nada aqui foi salvo em servidor.</p>
        <div className={s.actions}>
          <button type="button" className="btn btn-primary btn-lg" onClick={onRepetir}>Repetir</button>
          <Link className="btn btn-lg" href="/">Sair</Link>
        </div>
      </section>
      <footer className={s.credit}>{CREDITO}</footer>
    </main>
  );
}

function FitResumo({ fit }: { fit: Fit }) {
  const axes: [string, number][] = [["Cultura", fit.culture], ["Perfil", fit.profile], ["Soft skills", fit.soft_skills],
    ...(fit.hard_skills === null || fit.hard_skills === undefined ? [] : [["Hard skills", fit.hard_skills] as [string, number]])];
  return (
    <section className={s.fit} aria-labelledby="fit-title">
      <div className={s.fitHead}>
        <h2 id="fit-title" className={s.sectionTitle}>Seu fit com a vaga <Tip>Média ponderada de cultura, perfil comportamental, soft skills e hard skills, sempre com frases suas como evidência.</Tip></h2>
        <span className={s.fitScore}>{fit.overall}</span>
      </div>
      <div className={s.fitAxes}>
        {axes.map(([l, v]) => <div key={l}><span>{l}<b>{v}</b></span><i><em style={{ width: `${v}%` }} /></i></div>)}
      </div>
      <p className={s.fitSummary}>{fit.summary}</p>
      {fit.differentials.length > 0 && (
        <ul className={s.diffs}>{fit.differentials.map((d) => <li key={d.quote}><b>{d.title}</b><q>{d.quote}</q></li>)}</ul>
      )}
    </section>
  );
}

function ResultadoEmpresa({ script, session, onChange }: { script: Script; session: MoeSession; onChange: (s: MoeSession) => void }) {
  const headingRef = useFocusHeading();
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const a = session.analysis;
  const fit = a?.fit;

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
          <h1 ref={headingRef} tabIndex={-1} className={s.title}>Obrigado por confiar o que você contou</h1>
          <p className={s.notice}>Algo que você escreveu merece cuidado de gente. Por isso não geramos a leitura desta simulação e nada será compartilhado com a empresa.</p>
          <p className={s.small}>Se fizer sentido, converse com alguém de confiança, com o RH ou com um profissional de saúde. Em risco de vida, ligue para o <strong>CVV — 188</strong> (gratuito, 24 horas).</p>
          <div className={s.actions}><Link className="btn btn-lg" href="/app">Sair</Link></div>
        </section>
      </main>
    );
  }

  // Conversas: com a vaga, mostram o que cada resposta reflete nos critérios; sem vaga, os pontos tocados.
  const conversas = fit?.reflections?.length
    ? fit.reflections.map((r) => ({ who: r.persona, role: r.role, stage: r.stage, npc: r.npc_line, quote: r.quote,
      tags: r.reflects.map((x) => ({ key: x.axis + x.label, label: x.label, axis: x.axis as string })), note: r.note }))
    : (a?.conversations ?? []).map((c) => ({ who: c.persona, role: c.role, stage: c.stage, npc: c.npc_line, quote: c.quote,
      tags: c.points.map((p) => ({ key: p, label: p, axis: "point" })), note: "" }));

  return (
    <main className={s.result} id="conteudo">
      <header className={s.topbar}><Marca /><span className={s.badge}>Simulação fictícia</span></header>
      <section className={s.resultBody} aria-labelledby="resultado-title">
        <span className="eyebrow">{script.vaga ? `Vaga · ${script.vaga}` : script.titulo}</span>
        <h1 id="resultado-title" ref={headingRef} tabIndex={-1} className={s.title}>Sua experiência no escritório</h1>
        <p className={s.notice} role="note">{fit ? AVISO_VAGA : a?.notice ?? AVISO_MOE}</p>

        {fit && <FitResumo fit={fit} />}

        <section aria-labelledby="conv-title">
          <h2 id="conv-title" className={s.sectionTitle}>O que você disse e o que isso mostra
            <Tip>Cada fala de um personagem, sua resposta literal e os critérios que ela evidencia.</Tip></h2>
          <ol className={s.convList}>
            {conversas.map((c, i) => (
              <li key={i} className={s.conv}>
                <p className={s.convWho}><span className={s.avatar} aria-hidden>{c.who[0]}</span><b>{c.who}</b> · {c.role}{c.stage && <span className={s.convStage}>{c.stage}</span>}</p>
                <p className={s.convNpc}>{c.npc}</p>
                <blockquote className={s.quote}>{c.quote}</blockquote>
                {c.tags.length > 0
                  ? <p className={s.tags}>{c.tags.map((t) => <span key={t.key} className={s.tag} data-axis={t.axis} title={AXIS[t.axis as Axis] ?? "Ponto"}>{t.label}</span>)}</p>
                  : c.note && <p className={s.small}>{c.note}</p>}
              </li>
            ))}
          </ol>
        </section>

        {!fit && a && (
          <section aria-labelledby="pts-title">
            <h2 id="pts-title" className={s.sectionTitle}>Pontos que a empresa quis explorar
              <Tip>{a.method === "llm" ? "Leitura automática conferida: só aparecem trechos literais das suas respostas." : "Suas respostas agrupadas pelos pontos de cada cena, sem interpretação automática."}</Tip></h2>
            <ol className={s.points}>
              {a.points.map((p) => (
                <li key={p.point_id}>
                  <p className={s.pointName}>{p.name} · foco {p.weight}/5</p>
                  {p.signals.length > 0 && <p className={s.small}>Sinais: {p.signals.join(" · ")}</p>}
                  {p.quotes.length ? p.quotes.map((q) => <blockquote key={q} className={s.quote}>{q}</blockquote>) : <p className={s.small}>{p.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className={s.consent} role="group" aria-labelledby="consent-title">
          <h2 id="consent-title" className={s.sectionTitle}>Compartilhar com a empresa</h2>
          {session.share_with_tenant ? (
            <>
              <p role="status"><strong>Compartilhado.</strong> A empresa vê esta leitura{fit ? ", seu fit com a vaga" : ""} e suas respostas desta simulação. Você pode desfazer quando quiser.</p>
              <button className="btn" disabled={busy} onClick={() => void share(false)}>Deixar de compartilhar</button>
            </>
          ) : (
            <>
              <p>Esta leitura é sua. A empresa só vê se você autorizar, e você pode desfazer depois.</p>
              <button className="btn btn-primary" disabled={busy} onClick={() => void share(true)}>Compartilhar com a empresa</button>
            </>
          )}
          {erro && <p className="alert alert-error" role="alert">{erro}</p>}
        </div>
        <div className={s.actions}><Link className="btn btn-lg" href="/app">Sair</Link></div>
      </section>
      <footer className={s.credit}>{CREDITO}</footer>
    </main>
  );
}
