"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, DOMAINS, type DomainId, type TenantAnalytics } from "@/lib/api";
import { useMe } from "@/components/Shell";
import s from "./analytics.module.css";

const PERIODS = [{ days: 30, label: "30 dias" }, { days: 90, label: "90 dias" }, { days: 365, label: "12 meses" }, { days: 0, label: "Tudo" }];
const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

function Bars({ items, domain }: { items: { label: string; value: number; key?: string }[]; domain?: boolean }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length || items.every((i) => i.value === 0)) return <p className={s.empty}>Sem dados neste período.</p>;
  return (
    <ul className={s.bars}>
      {items.map((i) => (
        <li key={i.label} data-domain={domain ? i.key : undefined} title={`${i.label}: ${i.value}`}>
          <span className={s.barLabel}>{i.label}</span>
          <span className={s.track}><i style={{ width: `${(i.value / max) * 100}%` }} /></span>
          <span className={s.barValue}>{i.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Analytics() {
  const { me } = useMe();
  const router = useRouter();
  const [days, setDays] = useState(90);
  const [data, setData] = useState<TenantAnalytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!me.tenant || me.tenant.role === "participant") { router.replace("/app"); return; }
    setData(null);
    api<TenantAnalytics>(`/tenant/analytics?days=${days}`).then(setData).catch((e) => setError(e.message));
  }, [days, me, router]);

  const f = data?.funnel;
  const steps = f ? [
    { label: "Convidadas", value: f.invited },
    { label: "Aceitaram o convite", value: f.accepted },
    { label: "Começaram a entrevista", value: f.started },
    { label: "Concluíram o Mapa", value: f.completed },
  ] : [];
  const weekMax = Math.max(1, ...(data?.weekly ?? []).flatMap((w) => [w.invited, w.completed]));

  return (
    <div className={s.page}>
      <header className={s.head}>
        <h1>Análises</h1>
        <div className={s.periods} role="group" aria-label="Período">
          {PERIODS.map((p) => <button key={p.days} aria-pressed={days === p.days} onClick={() => setDays(p.days)}>{p.label}</button>)}
        </div>
      </header>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {!data ? <p className="hint" role="status">Carregando…</p> : (
        <>
          <section className={s.figures} aria-label="Indicadores">
            <div><b>{pct(data.completion_rate)}</b><span>de quem começou concluiu o Mapa</span></div>
            <div><b>{data.avg_minutes === null ? "—" : `${data.avg_minutes} min`}</b><span>de conversa, em média, por Mapa concluído</span></div>
            <div><b>{f!.cancelled}</b><span>{f!.cancelled === 1 ? "entrevista cancelada" : "entrevistas canceladas"} por advertências</span></div>
            <div><b>{data.shared_profiles}</b><span>{data.shared_profiles === 1 ? "Mapa compartilhado" : "Mapas compartilhados"} com a empresa</span></div>
          </section>

          <section className={s.block} aria-labelledby="funil">
            <h2 id="funil">Do convite ao Mapa</h2>
            <ol className={s.funnel}>
              {steps.map((step, i) => (
                <li key={step.label}>
                  <span className={s.barLabel}>{step.label}</span>
                  <span className={s.track}><i style={{ width: `${steps[0].value ? (step.value / steps[0].value) * 100 : 0}%` }} /></span>
                  <span className={s.barValue}>{step.value}{i > 0 && steps[0].value ? <small> · {Math.round((step.value / steps[0].value) * 100)}%</small> : null}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className={s.block} aria-labelledby="semanas">
            <div className={s.blockHead}>
              <h2 id="semanas">Últimas 8 semanas</h2>
              <ul className={s.legend} aria-label="Legenda">
                <li><i className={s.swInvited} />Convites</li>
                <li><i className={s.swDone} />Mapas concluídos</li>
              </ul>
            </div>
            <div className={s.weeks} role="img" aria-label="Convites e Mapas concluídos por semana; detalhes na tabela abaixo">
              {data.weekly.map((w) => (
                <div key={w.week} className={s.week}>
                  <div className={s.cols}>
                    <span className={s.colInvited} style={{ height: `${(w.invited / weekMax) * 100}%` }} data-tip={`${w.invited} convites`} />
                    <span className={s.colDone} style={{ height: `${(w.completed / weekMax) * 100}%` }} data-tip={`${w.completed} concluídos`} />
                  </div>
                  <span className={s.weekLabel}>{w.week}</span>
                </div>
              ))}
            </div>
            <details className={s.table}>
              <summary>Ver como tabela</summary>
              <table>
                <thead><tr><th scope="col">Semana de</th><th scope="col">Convites</th><th scope="col">Mapas concluídos</th></tr></thead>
                <tbody>{data.weekly.map((w) => <tr key={w.week}><td>{w.week}</td><td>{w.invited}</td><td>{w.completed}</td></tr>)}</tbody>
              </table>
            </details>
          </section>

          <div className={s.grid}>
            <section className={s.block} aria-labelledby="talentos">
              <h2 id="talentos">Talentos nos Mapas compartilhados</h2>
              <p className={s.note}>Só entram Mapas que cada pessoa decidiu compartilhar. Alertas de bem-estar nunca aparecem aqui.</p>
              <Bars items={data.talents} domain />
              {data.talents.length > 0 && (
                <ul className={s.legend} aria-label="Domínios">
                  {(Object.keys(DOMAINS) as DomainId[]).map((d) => <li key={d} data-domain={d}><i className={s.swDomain} />{DOMAINS[d].name}</li>)}
                </ul>
              )}
            </section>
            <section className={s.block} aria-labelledby="caminhos">
              <h2 id="caminhos">Caminhos de interesse</h2>
              <Bars items={data.paths} />
              <h2 id="dominios" className={s.sub}>Talentos por domínio</h2>
              <Bars items={data.domains} domain />
            </section>
            <section className={s.block} aria-labelledby="tentativas">
              <h2 id="tentativas">Tentativas usadas</h2>
              <p className={s.note}>Cada entrevista tem até 3 tentativas, para quedas de conexão.</p>
              <Bars items={data.attempts} />
              <h2 className={s.sub}>Como as tentativas terminaram</h2>
              <Bars items={data.end_reasons} />
            </section>
            <section className={s.block} aria-labelledby="guardrails">
              <h2 id="guardrails">Advertências da entrevistadora</h2>
              <p className={s.note}>{data.violations_total} {data.violations_total === 1 ? "advertência" : "advertências"} em {data.interviews_with_violations} {data.interviews_with_violations === 1 ? "entrevista" : "entrevistas"}. Na 3ª, a entrevista é cancelada.</p>
              <Bars items={data.violations_by_kind} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
