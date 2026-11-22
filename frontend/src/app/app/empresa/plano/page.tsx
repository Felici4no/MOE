"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, brl, type CheckoutUrl, type Plan, type TenantBilling } from "@/lib/api";
import { useAdmin } from "@/lib/useAdmin";
import { Tip } from "@/components/Tip";
import s from "../company.module.css";

function PlanPage() {
  const admin = useAdmin();
  const params = useSearchParams();
  const [billing, setBilling] = useState<TenantBilling | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paying, setPaying] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [b, p] = await Promise.all([api<TenantBilling>("/tenant/billing"), api<Plan[]>("/plans")]);
      setBilling(b); setPlans(p);
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { if (admin) void load(); }, [admin, load]);

  async function pay(path: string, body?: unknown) {
    setPaying(path + JSON.stringify(body ?? "")); setError("");
    try {
      const out = await api<CheckoutUrl>(path, body ? { body } : { method: "POST" });
      if (out.mode === "dev") { await load(); setPaying(""); } else window.location.assign(out.url);
    } catch (e) { setError((e as Error).message); setPaying(""); }
  }

  if (!admin) return null;
  return (
    <div className={s.page}>
      <header className="page-head"><div><h1>Plano</h1></div></header>
      {params.get("plano") === "ok" && <p className="alert alert-ok" role="status">Assinatura confirmada.</p>}
      {params.get("plano") === "cancelado" && <p className="alert alert-info" role="status">Assinatura cancelada antes do pagamento. Nada foi cobrado.</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {billing && (
        <section className={`${s.panel} ${s.planBox}`} aria-labelledby="cur">
          <div>
            <span className="eyebrow">Plano atual</span>
            <h2 id="cur" style={{ fontSize: 24 }}>{billing.trial ? "Teste gratuito" : billing.plan_name}</h2>
            <p className={s.muted} style={{ marginTop: 6 }}>
              {billing.limit === null ? `${billing.used} convites neste período` : `${billing.used} de ${billing.limit} convites ${billing.trial ? "do teste" : "neste mês"}`}
              {billing.period_end && !billing.trial && ` · renova em ${new Date(billing.period_end).toLocaleDateString("pt-BR")}`}
              {" "}<Tip>Cada candidato convidado usa uma entrevista da cota. Reenviar um convite não gasta outra.</Tip>
            </p>
            {billing.limit !== null && (
              <span className={s.meter} role="meter" aria-valuemin={0} aria-valuemax={billing.limit} aria-valuenow={billing.used} aria-label="Convites usados">
                <i style={{ width: `${Math.min(100, (billing.used / Math.max(1, billing.limit)) * 100)}%` }} />
              </span>
            )}
          </div>
          {billing.portal && <button className="btn" disabled={paying !== ""} onClick={() => pay("/billing/portal")}>Faturas e cobrança</button>}
        </section>
      )}
      <div className={s.plans}>
        {plans.map((p) => {
          const current = billing?.plan === p.id && !billing.trial;
          return (
            <section key={p.id} className={`${s.panel} ${s.plan}`} aria-labelledby={`pl-${p.id}`}>
              <h2 id={`pl-${p.id}`}>{p.name}</h2>
              <p className={s.price}>{p.price_cents === null ? "Sob consulta" : <>{brl(p.price_cents)}<small>/mês</small></>}</p>
              <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              {p.billing === "monthly" ? (
                <button className={`btn ${current ? "" : "btn-primary"}`} disabled={current || paying !== ""} onClick={() => pay("/billing/subscribe", { plan: p.id })}>
                  {paying.includes(p.id) ? <span className="spinner" aria-hidden /> : null}{current ? "Plano atual" : `Assinar ${p.name}`}
                </button>
              ) : (
                <Link className="btn" href="/contato">Falar com vendas</Link>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><PlanPage /></Suspense>;
}
