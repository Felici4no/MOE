"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, DOMAINS, type DomainId, type Interview, type Result } from "@/lib/api";
import { useMe } from "@/components/Shell";
import s from "./profile.module.css";

export default function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me } = useMe();
  const [result, setResult] = useState<Result | null>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Result>(`/interviews/${id}/result`).then(setResult).catch((e) => setError(e.message));
    api<Interview[]>("/interviews").then((all) => setInterview(all.find((i) => i.id === id) ?? null)).catch(() => undefined);
  }, [id]);

  async function share(value: boolean) {
    setSaving(true);
    try { setInterview(await api<Interview>(`/interviews/${id}/share`, { body: { share_with_tenant: value } })); }
    catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  if (error) return <p className="alert alert-error" role="alert">{error}</p>;
  if (!result) return <p role="status" className="hint">Carregando seu Mapa…</p>;

  const date = new Date(result.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  if (result.wellbeing_alert) {
    return (
      <article className={s.page}>
        <header className={s.head}>
          <h1>Obrigado por conversar com a gente</h1>
          <p className={s.summary}>{result.summary}</p>
        </header>
        <p className={s.disclaimer}>Este Mapa fica só com você e não é compartilhado com nenhuma empresa.</p>
        <Link href="/app" className="btn">Voltar ao início</Link>
      </article>
    );
  }

  const byDomain = (Object.keys(DOMAINS) as DomainId[]).map((d) => ({ id: d, count: result.themes.filter((t) => t.domain === d).length }));

  return (
    <article className={s.page}>
      <header className={s.head}>
        <h1>Seu Mapa de Talentos</h1>
        <p className={s.summary}>{result.summary}</p>
        <p className={s.meta}>
          Entrevista de {date}. Cada talento só aparece com pelo menos duas falas suas, conferidas palavra por palavra na transcrição.
          {result.method === "lexical" && " Este Mapa foi montado pelos sinais nas suas falas, sem a leitura completa do analista."}
        </p>
        <ul className={s.domains} aria-label="Talentos por domínio">
          {byDomain.map((d) => (
            <li key={d.id} data-domain={d.id} data-empty={d.count === 0 || undefined}>
              <b>{DOMAINS[d.id].name}</b><span>{d.count === 1 ? "1 talento" : `${d.count} talentos`}</span>
            </li>
          ))}
        </ul>
      </header>

      {result.themes.length === 0 ? (
        <p className={s.none}>A conversa ainda não trouxe duas histórias para nenhum talento, então preferimos não chutar. Com exemplos concretos o seu Mapa fica bem mais rico.</p>
      ) : (
        <ol className={s.themes} aria-label="Seus talentos principais">
          {result.themes.map((theme, index) => (
            <li key={theme.id} className={s.theme} data-domain={theme.domain}>
              <div className={s.rank} aria-hidden>{index + 1}</div>
              <div className={s.body}>
                <div className={s.titleRow}>
                  <h2>{theme.name}</h2>
                  <span className="tag" data-domain={theme.domain}>{DOMAINS[theme.domain].name}</span>
                  <span className={s.confidence} data-c={theme.confidence}>{theme.confidence}</span>
                </div>
                <p className={s.def}>{theme.summary}</p>
                {theme.at_work && <p className={s.work}><b>No trabalho:</b> {theme.at_work}</p>}
                <ul className={s.quotes} aria-label={`O que você disse sobre ${theme.name}`}>
                  {theme.evidence.map((q) => <li key={q}><span className={s.r} aria-hidden>R</span><p><mark>{q}</mark></p></li>)}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      )}

      {(result.paths.length > 0 || result.discovering) && (
        <section className={s.extra}>
          {result.paths.length > 0 && (
            <div>
              <h2>Seus caminhos</h2>
              <ul className={s.paths}>
                {result.paths.map((p) => <li key={p.name}><b>{p.name}</b><p><mark>{p.evidence}</mark></p></li>)}
              </ul>
            </div>
          )}
          {result.discovering && (
            <div className={s.discover} data-domain={result.discovering.domain}>
              <h2>Ainda em descoberta</h2>
              <p><b>{result.discovering.name}</b></p>
              <p className={s.invite}>{result.discovering.invite}</p>
            </div>
          )}
        </section>
      )}

      <footer className={s.foot}>
        {me.tenant && interview && (
          <div className={s.share}>
            <div>
              <h2>Compartilhar com {me.tenant.name}</h2>
              <p>{interview.share_with_tenant
                ? "A empresa vê os nomes dos seus talentos principais. Suas falas e a transcrição continuam só com você."
                : "Hoje só você vê este Mapa. Se compartilhar, a empresa vê apenas os nomes dos seus talentos principais."}</p>
            </div>
            <button className={`btn ${interview.share_with_tenant ? "" : "btn-primary"}`} onClick={() => share(!interview.share_with_tenant)} disabled={saving} aria-pressed={interview.share_with_tenant}>
              {interview.share_with_tenant ? "Parar de compartilhar" : "Compartilhar talentos"}
            </button>
          </div>
        )}
        <p className={s.disclaimer}>{result.notice} Não use para decidir contratação, demissão ou promoção.</p>
        <Link href="/app" className="btn">Voltar ao início</Link>
      </footer>
    </article>
  );
}
