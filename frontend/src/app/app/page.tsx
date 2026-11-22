"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type Interview } from "@/lib/api";
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
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (me.tenant && me.tenant.role !== "participant") { router.replace("/app/empresa"); return; }
    api<Interview[]>("/interviews").then(setInterviews).catch((e) => setError(e.message));
  }, [me, router]);

  const open = interviews?.filter((i) => OPEN.includes(i.status)) ?? [];
  const startable = me.tests.filter((t) => !open.some((i) => i.kind === t.id));
  const done = interviews?.filter((i) => !OPEN.includes(i.status)) ?? [];
  const firstName = me.name.split(" ")[0];

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
          <p>{open.length || startable.length ? "Sua entrevista está pronta." : "Nenhuma entrevista pendente."}</p>
        </div>
        <ul className={s.prep} aria-label="Antes de começar">
          <li><Headphones />Fone e microfone<Tip side="end">Use fone se puder. Na sala você escolhe o microfone e a saída de áudio.</Tip></li>
          <li><Chat />~10 min<Tip side="end">Conte histórias reais de como você trabalha. Não existe resposta certa.</Tip></li>
          <li><Captions />Transcrição ao vivo</li>
        </ul>
      </header>

      {error && <p className="alert alert-error" role="alert">{error}</p>}

      {interviews === null ? <p className="hint" role="status">Carregando…</p> : (
        <>
          {(open.length > 0 || startable.length > 0) && (
            <ul className={s.cards}>
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
            {done.length === 0 ? <p className="hint">Seu Mapa aparece aqui ao fim da conversa.</p> : (
              <ul className={s.list}>
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
