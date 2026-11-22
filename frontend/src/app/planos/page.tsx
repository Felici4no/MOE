"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, brl, type Plan } from "@/lib/api";
import { Wordmark } from "@/components/Wordmark";
import { Arrow } from "@/components/icons";
import s from "./plans.module.css";

function price(plan: Plan) {
  if (plan.free_testing) return <span className={s.amount}>Grátis para testar</span>;
  if (plan.available === false) return <span className={s.per}>Compra pausada</span>;
  if (plan.billing === "contact" || plan.price_cents === null) return <span className={s.amount}>Sob consulta</span>;
  return <><span className={s.amount}>{brl(plan.price_cents)}</span><span className={s.per}>{plan.billing === "monthly" ? "por mês" : "pagamento único"}</span></>;
}

export default function Plans() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { api<Plan[]>("/plans").then(setPlans).catch((e) => setError(e.message)); }, []);

  async function contact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    setBusy(true); setError("");
    try {
      await api("/leads", { body: { ...form, people: Number(form.people || 0) } });
      setSent(true);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <main className={s.page}>
      <header className={s.head}>
        <Link href="/" className={s.home}><Wordmark /></Link>
        <h1>Planos</h1>
        <p>Valores de referência em reais. Os planos de empresa são assinaturas mensais, com fatura emitida pela Stripe.</p>
      </header>

      {!plans ? <p className="hint" role="status">{error || "Carregando planos…"}</p> : (
        <div className={s.grid}>
          {plans.map((plan) => (
            <section key={plan.id} className={s.plan} data-plan={plan.id} aria-labelledby={`p-${plan.id}`}>
              <h2 id={`p-${plan.id}`}>{plan.name}</h2>
              <p className={s.pitch}>{plan.pitch}</p>
              <p className={s.price}>{price(plan)}</p>
              <ul>{plan.features.map((f) => <li key={f}>{f}</li>)}</ul>
              {plan.id === "individual" && (plan.free_testing || plan.available !== false) && (
                <Link className="btn btn-primary" href="/?modo=cadastro#acesso">
                  {plan.free_testing ? "Testar sem pagar" : "Criar conta individual"} <Arrow />
                </Link>
              )}
              {plan.billing === "monthly" && (
                <Link className="btn btn-primary" href="/?acesso=empresa&modo=cadastro#acesso">Criar espaço da empresa <Arrow /></Link>
              )}
              {plan.id === "enterprise" && (
                sent ? <p className="alert alert-ok" role="status">Recebemos seu contato. O time comercial vai falar com você diretamente.</p> : (
                  <form className={s.form} onSubmit={contact}>
                    <div className="field"><label htmlFor="l-name">Nome</label><input id="l-name" name="name" required minLength={2} autoComplete="name" /></div>
                    <div className="field"><label htmlFor="l-email">E-mail de trabalho</label><input id="l-email" name="email" type="email" required autoComplete="email" /></div>
                    <div className="field"><label htmlFor="l-company">Empresa</label><input id="l-company" name="company" required minLength={2} autoComplete="organization" /></div>
                    <div className="field"><label htmlFor="l-people">Pessoas por mês (estimativa)</label><input id="l-people" name="people" type="number" min={0} inputMode="numeric" /></div>
                    {error && <p className="alert alert-error" role="alert">{error}</p>}
                    <button className="btn btn-paper" disabled={busy}>{busy ? <span className="spinner" aria-hidden /> : null}Falar com o comercial</button>
                  </form>
                )
              )}
            </section>
          ))}
        </div>
      )}
      <p className={s.note}>Empresas sem plano podem testar com 2 convites. As integrações com plataformas de recrutamento são configuradas com o time de implantação. O Mapa de Talentos é uma ferramenta de autoconhecimento e desenvolvimento; não use para decidir contratação, demissão ou promoção.</p>
    </main>
  );
}
