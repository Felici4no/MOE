"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type Interview } from "@/lib/api";
import type { Available } from "@/lib/moe/api";
import { useMe } from "@/components/Shell";
import { Arrow, Captions, Chat, Headphones } from "@/components/icons";
import { Tip } from "@/components/Tip";
import { STATUS, TEST_NAME } from "@/lib/labels";
import s from "./home.module.css";

const OPEN = ["ready", "live"];

export default function Home() {
  const { me } = useMe();
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[] | null>(null);
  const [sims, setSims] = useState<(Available & { job_title: string | null; stages: string[] })[]>([]);
  const [simSessions, setSimSessions] = useState<{ id: string; title: string; status: "playing" | "finished"; answered: number; scenes: number; finished_at: string | null }[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (me.tenant && me.tenant.role !== "participant") { router.replace("/app/empresa"); return; }
    api<Interview[]>("/interviews").then(setInterviews).catch((e) => setError(e.message));
    api<typeof sims>("/moe/play/scenarios").then((a) => setSims(a.filter((x) => x.job_title))).catch(() => undefined);
    api<typeof simSessions>("/moe/play/sessions").then(setSimSessions).catch(() => undefined);
  }, [me, router]);

  const open = interviews?.filter((i) => OPEN.includes(i.status)) ?? [];
  const startable = me.tests.filter((t) => !open.some((i) => i.kind === t.id));
  const done = interviews?.filter((i) => !OPEN.includes(i.status)) ?? [];
  const firstName = me.name.split(" ")[0];
  const simOpen = sims.map((sc) => ({ sc, session: simSessions.find((x) => x.title === sc.title) }))
    .filter(({ session }) => !session || session.status === "playing");
  const simDone = simSessions.filter((x) => x.status === "finished");

  async function start(kind: string, existing?: Interview) {
    setBusy(existing?.id ?? kind); setError("");
    try {
      const interview = existing ?? await api<Interview>("/interviews", { body: { kind } });
      router.push(`/app/entrevista/${interview.id}`);
    } catch (e) { setError((e as Error).message); setBusy(""); }
  }

  return (
    <div className={s.page}>
      <header className="page-head">
        <div>
          <h1>Olá, {firstName}</h1>
          <p>{open.length || startable.length || simOpen.length ? "Sua avaliação está pronta." : "Nenhuma avaliação pendente."}</p>
        </div>
        {(open.length > 0 || startable.length > 0) && <ul className={s.prep} aria-label="Antes de começar">
          <li><Headphones />Fone e microfone<Tip side="end">Use fone se puder. Na sala você escolhe o microfone e a saída de áudio.</Tip></li>
          <li><Chat />~10 min<Tip side="end">Conte histórias reais de como você trabalha. Não existe resposta certa.</Tip></li>
          <li><Captions />Transcrição ao vivo</li>
        </ul>}
      </header>

      {error && <p className="alert alert-error" role="alert">{error}</p>}

      {interviews === null ? <p className="hint" role="status">Carregando…</p> : (
        <>
          {(open.length > 0 || startable.length > 0 || simOpen.length > 0) && (
            <ul className={s.cards}>
              {simOpen.map(({ sc, session }) => (
                <li key={sc.id} className={s.card}>
                  <span className="eyebrow">{me.tenant?.name} · simulação no escritório</span>
                  <h2>{sc.job_title}</h2>
                  {sc.stages.length > 0 && <p className={s.stages}>{sc.stages.join(" → ")}</p>}
                  <p className={s.meta}>{session ? `Em andamento · ${session.answered} de ${session.scenes} respostas` : `${sc.scenes} conversas · por texto`}</p>
                  <Link className="btn btn-primary btn-lg" href={session ? `/moe?sessao=${session.id}` : `/moe?cenario=${sc.id}`}>
                    {session ? "Continuar" : "Entrar no escritório"}<Arrow />
                  </Link>
                </li>
              ))}
              {open.map((i) => (
                <li key={i.id} className={s.card}>
                  <span className="eyebrow">{me.tenant?.name}</span>
                  <h2>{i.job_title ?? TEST_NAME[i.kind]}</h2>
                  <p className={s.meta}>{i.status === "live" ? "Em andamento" : "Pronta para começar"} · {i.kind === "rapida" ? "cerca de 3 min" : "cerca de 10 min"}</p>
                  <button className="btn btn-primary btn-lg" onClick={() => start(i.kind, i)} disabled={busy !== ""}>
                    {busy === i.id ? <span className="spinner" aria-hidden /> : null}{i.status === "live" ? "Continuar" : "Começar entrevista"}<Arrow />
                  </button>
                </li>
              ))}
              {startable.map((t) => (
                <li key={t.id} className={s.card}>
                  <span className="eyebrow">{me.tenant?.name}</span>
                  <h2>{TEST_NAME[t.id] ?? t.name}</h2>
                  <p className={s.meta}>{t.minutes}</p>
                  <button className="btn btn-primary btn-lg" onClick={() => start(t.id)} disabled={busy !== ""}>
                    {busy === t.id ? <span className="spinner" aria-hidden /> : null}Começar entrevista<Arrow />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <section aria-labelledby="hist" className={s.history}>
            <h2 id="hist">Concluídas</h2>
            {done.length === 0 && simDone.length === 0 ? <p className="hint">Sua leitura aparece aqui ao fim da conversa.</p> : (
              <ul className={s.list}>
                {simDone.map((x) => (
                  <li key={x.id}>
                    <span className={s.what}><b>{x.title}</b><span>Simulação · {x.finished_at ? new Date(x.finished_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : ""}</span></span>
                    <span className="stamp" data-s="analyzed">Concluída</span>
                    <Link className="btn btn-sm" href={`/moe?sessao=${x.id}`}>Ver leitura</Link>
                  </li>
                ))}
                {done.map((i) => (
                  <li key={i.id}>
                    <span className={s.what}><b>{i.job_title ?? TEST_NAME[i.kind]}</b><span>{new Date(i.ended_at ?? i.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</span></span>
                    <span className="stamp" data-s={i.status}>{STATUS[i.status]}</span>
                    {i.status === "analyzed" && <Link className="btn btn-sm" href={`/app/perfil/${i.id}`}>Ver meu Mapa</Link>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
