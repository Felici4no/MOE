"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, brl, type CheckoutUrl, type Invite, type Person, type Plan, type TenantBilling } from "@/lib/api";
import { useMe } from "@/components/Shell";
import { Copy, Plus, Send } from "@/components/icons";
import { ROLE, STATUS, TEST_NAME } from "@/lib/labels";
import s from "./company.module.css";

const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export default function Company() {
  const { me } = useMe();
  const router = useRouter();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [link, setLink] = useState<{ email: string; url: string; emailed: boolean } | null>(null);
  const [resending, setResending] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"todos" | "pendente" | "concluido">("todos");
  const [billing, setBilling] = useState<TenantBilling | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paying, setPaying] = useState("");

  const load = useCallback(async () => {
    try {
      const [p, i, b, pl] = await Promise.all([api<Person[]>("/tenant/people"), api<Invite[]>("/tenant/invites"),
        api<TenantBilling>("/tenant/billing"), api<Plan[]>("/plans")]);
      setPeople(p); setInvites(i); setBilling(b); setPlans(pl.filter((x) => x.billing === "monthly"));
    } catch (e) { setError((e as Error).message); }
  }, []);

  useEffect(() => {
    if (!me.tenant || me.tenant.role === "participant") { router.replace("/app"); return; }
    void load();
  }, [me, router, load]);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const data = new FormData(formEl);
    const tests = data.getAll("tests").map(String);
    if (!tests.length) { setError("Escolha pelo menos um teste."); return; }
    setBusy(true); setError(""); setCopied(false);
    try {
      const out = await api<Invite>("/tenant/invites", { body: { name: data.get("name"), email: data.get("email"), tests } });
      setLink({ email: out.email, url: out.link ?? "", emailed: Boolean(out.emailed) });
      formEl.reset();
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function pay(path: string, body?: unknown) {
    setPaying(path); setError("");
    try {
      const out = await api<CheckoutUrl>(path, body ? { body } : { method: "POST" });
      if (out.mode === "dev") { await load(); setPaying(""); } else window.location.assign(out.url);
    } catch (e) { setError((e as Error).message); setPaying(""); }
  }

  async function resend(id: string) {
    setResending(id); setError(""); setCopied(false);
    try {
      const out = await api<Invite>(`/tenant/invites/${id}/resend`, { method: "POST" });
      setLink({ email: out.email, url: out.link ?? "", emailed: Boolean(out.emailed) });
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setResending(""); }
  }

  async function revoke(id: string) {
    try { await api(`/tenant/invites/${id}/revoke`, { method: "POST" }); await load(); }
    catch (e) { setError((e as Error).message); }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link.url).catch(() => undefined);
    setCopied(true);
  }

  const participants = (people ?? []).filter((p) => p.role === "participant");
  const finished = participants.filter((p) => p.interview_status === "analyzed").length;
  const shown = participants.filter((p) => filter === "todos" || (filter === "concluido" ? p.interview_status === "analyzed" : p.interview_status !== "analyzed"));

  return (
    <div className={s.page}>
      <header className={s.head}>
        <h1>{me.tenant?.name}</h1>
        <p>{people === null ? "Carregando…" : participants.length === 0 ? "Nenhum convite aceito ainda." : `${participants.length} ${participants.length === 1 ? "pessoa no espaço" : "pessoas no espaço"} · ${finished} com perfil pronto`}</p>
      </header>

      {billing && (
        <section className={s.planBox} aria-labelledby="plan">
          <div className={s.planInfo}>
            <h2 id="plan">Plano {billing.plan_name}</h2>
            <p>
              {billing.limit === null ? `${billing.used} convites neste período` : `${billing.used} de ${billing.limit} convites ${billing.trial ? "do teste" : "neste mês"}`}
              {billing.period_end && !billing.trial && ` · renova em ${new Date(billing.period_end).toLocaleDateString("pt-BR")}`}
            </p>
            {billing.limit !== null && (
              <span className={s.meter} role="meter" aria-valuemin={0} aria-valuemax={billing.limit} aria-valuenow={billing.used} aria-label="Convites usados">
                <i style={{ width: `${Math.min(100, (billing.used / Math.max(1, billing.limit)) * 100)}%` }} />
              </span>
            )}
          </div>
          <div className={s.planActions}>
            {billing.trial ? plans.map((p) => (
              <button key={p.id} className="btn btn-primary" disabled={paying !== ""} onClick={() => pay("/billing/subscribe", { plan: p.id })}>
                {paying === "/billing/subscribe" ? <span className="spinner" aria-hidden /> : null}Assinar {p.name}{p.price_cents ? ` · ${brl(p.price_cents)}/mês` : ""}
              </button>
            )) : billing.portal ? (
              <button className="btn" disabled={paying !== ""} onClick={() => pay("/billing/portal")}>Faturas e cobrança</button>
            ) : null}
            <Link className="btn btn-ghost" href="/planos">Comparar planos e Enterprise</Link>
          </div>
        </section>
      )}

      <section className={s.inviteBox} aria-labelledby="inv">
        <h2 id="inv">Convidar alguém</h2>
        <form className={s.inviteForm} onSubmit={invite}>
          <div className="field"><label htmlFor="iname">Nome</label><input id="iname" name="name" maxLength={160} autoComplete="off" /></div>
          <div className="field"><label htmlFor="iemail">E-mail</label><input id="iemail" name="email" type="email" required autoComplete="off" /></div>
          <button className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" aria-hidden /> : <Plus />}Gerar convite</button>
          <fieldset className={s.tests}>
            <legend>Testes do convite</legend>
            <label><input type="checkbox" name="tests" value="completa" defaultChecked /> Mapa de Talentos <span>cerca de 10 min</span></label>
            <label><input type="checkbox" name="tests" value="rapida" /> Mapa rápido <span>cerca de 3 min</span></label>
            <span className={s.testsHint}>Cada teste usa uma entrevista da cota.</span>
          </fieldset>
        </form>
        {link && (
          <div className={s.link} role="status">
            <p>{link.emailed
              ? <>Enviamos o convite por e-mail para <b>{link.email}</b>. Se preferir, copie o link e mande por outro canal; ele só aparece agora.</>
              : <>Convite para <b>{link.email}</b>. Copie o link e envie para a pessoa (WhatsApp, e-mail, Teams); por segurança ele só aparece agora.</>}</p>
            <div className={s.linkRow}>
              <code>{link.url}</code>
              <button className="btn" onClick={copy}><Copy />{copied ? "Copiado" : "Copiar link"}</button>
            </div>
          </div>
        )}
        {error && <p className="alert alert-error" role="alert">{error}</p>}
      </section>

      <section aria-labelledby="ppl" className={s.block}>
        <div className={s.blockHead}>
          <h2 id="ppl">Pessoas</h2>
          <div className={s.filters} role="group" aria-label="Filtrar pessoas">
            {(["todos", "pendente", "concluido"] as const).map((f) => (
              <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === "todos" ? "Todas" : f === "pendente" ? "Sem perfil" : "Com perfil"}
              </button>
            ))}
          </div>
        </div>
        {people === null ? <p className="hint">Carregando…</p> : shown.length === 0 ? (
          <p className={s.empty}>{participants.length === 0 ? "Ninguém aceitou um convite ainda. Gere o primeiro acima." : "Ninguém neste filtro."}</p>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th scope="col">Pessoa</th><th scope="col">Entrevista</th><th scope="col">Temas principais</th></tr></thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.user_id}>
                    <td><b>{p.name}</b><span>{p.email}</span></td>
                    <td><span className="stamp" data-s={p.interview_status ?? "none"}>{STATUS[p.interview_status ?? "none"]}</span></td>
                    <td>{p.shared ? (p.top_themes.length ? p.top_themes.join(", ") : "—") : <span className={s.private}>Não compartilhado</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint">Os temas só aparecem quando a pessoa decide compartilhar. Falas e transcrições nunca são exibidas para a empresa.</p>
      </section>

      <section aria-labelledby="hist" className={s.block}>
        <h2 id="hist">Convites</h2>
        {invites === null ? <p className="hint">Carregando…</p> : invites.length === 0 ? (
          <p className={s.empty}>Nenhum convite gerado.</p>
        ) : (
          <ul className={s.invites}>
            {invites.map((i) => (
              <li key={i.id}>
                <span className="stamp" data-s={i.status}>{STATUS[i.status]}</span>
                <span className={s.who}><b>{i.name || i.email}</b>{i.name && <span>{i.email}</span>}<span>{(i.tests ?? ["completa"]).map((t) => TEST_NAME[t] ?? t).join(" + ")}</span></span>
                <span className={s.when}>{i.status === "sent" ? `vale até ${fmt(i.expires_at)}` : fmt(i.status_at)}</span>
                <span className={s.inviteActions}>
                  {(i.status === "sent" || i.status === "expired") && (
                    <button className="btn btn-ghost" onClick={() => resend(i.id)} disabled={resending !== ""}>
                      {resending === i.id ? <span className="spinner" aria-hidden /> : <Send />}Reenviar
                    </button>
                  )}
                  {i.status === "sent" && <button className="btn btn-ghost" onClick={() => revoke(i.id)}>Cancelar</button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className={s.foot}>{ROLE[me.tenant?.role ?? "owner"]} · {me.email}</p>
    </div>
  );
}
