"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type CheckoutUrl, type Interview } from "@/lib/api";
import { useMe } from "@/components/Shell";
import { Arrow, Captions, Chat, Mic } from "@/components/icons";
import { STATUS, TEST_NAME } from "@/lib/labels";
import s from "./home.module.css";

function Home() {
  const { me, refresh } = useMe();
  const router = useRouter();
  const params = useSearchParams();
  const [interviews, setInterviews] = useState<Interview[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const purchase = params.get("compra");

  useEffect(() => {
    if (me.tenant && me.tenant.role !== "participant") { router.replace("/app/empresa"); return; }
    api<Interview[]>("/interviews").then(setInterviews).catch((e) => setError(e.message));
  }, [me, router]);

  useEffect(() => { if (purchase === "ok") void refresh(); }, [purchase, refresh]);

  const openList = interviews?.filter((i) => i.status === "ready" || i.status === "live") ?? [];
  // Um botão por modalidade com entrevista aberta ou disponível para começar.
  const options = [
    ...openList.map((i) => ({ kind: i.kind ?? "completa", interview: i })),
    ...me.tests.filter((t) => !openList.some((i) => (i.kind ?? "completa") === t.id)).map((t) => ({ kind: t.id, interview: undefined as Interview | undefined })),
  ];
  const done = interviews?.filter((i) => i.status === "analyzed") ?? [];
  const canStart = options.length > 0;
  const restartable = me.can_restart_interviews ? interviews?.[0] : undefined;
  const needsAccess = !canStart && !restartable;

  async function buy() {
    setBusy("buy"); setError("");
    try {
      const out = await api<CheckoutUrl>("/billing/checkout", { method: "POST" });
      window.location.assign(out.url);
    } catch (e) { setError((e as Error).message); setBusy(""); }
  }

  async function start(kind: string, existing?: Interview) {
    setBusy(kind); setError("");
    try {
      const interview = existing ?? await api<Interview>("/interviews", { body: { kind } });
      router.push(`/app/entrevista/${interview.id}`);
    } catch (e) { setError((e as Error).message); setBusy(""); }
  }

  async function restart(interview: Interview) {
    if (interview.status === "live" && !window.confirm("Encerrar a sessão atual e iniciar uma nova entrevista de teste?")) return;
    setBusy("restart");
    setError("");
    try {
      const next = await api<Interview>(`/interviews/${interview.id}/restart`, { method: "POST" });
      router.push(`/app/entrevista/${next.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }

  const firstName = me.name.split(" ")[0];

  return (
    <div className={s.page}>
      {purchase === "ok" && <p className="alert alert-ok" role="status">Compra confirmada. Sua entrevista está liberada.</p>}
      {purchase === "cancelada" && <p className="alert alert-info" role="status">A compra foi cancelada. Nada foi cobrado.</p>}

      <section className={s.hero} aria-labelledby="h">
        <div className={s.copy}>
          <h1 id="h">{canStart ? `${firstName}, a Lia está pronta para conversar.` : `${firstName}, vamos marcar sua conversa?`}</h1>
          <p>
            {me.tenant
              ? `Convite de ${me.tenant.name}. A entrevista é sua; você decide depois se a empresa vê o resultado.`
              : "Fale com calma, com exemplos de verdade. Não existe resposta certa: a Lia quer ouvir como você faz as coisas."}
          </p>
          <div className={s.actions}>
            {canStart && options.map((o, idx) => (
              <button key={o.kind} className={`btn ${idx === 0 ? "btn-primary" : ""}`} onClick={() => start(o.kind, o.interview)} disabled={busy !== ""}>
                {busy === o.kind ? <span className="spinner" aria-hidden /> : <Chat />}
                {o.interview ? "Continuar" : "Começar"} {TEST_NAME[o.kind] ?? "entrevista"}
              </button>
            ))}
            {needsAccess && me.kind === "individual" && (
              me.individual_checkout_available ? (
                <button className="btn btn-primary" onClick={buy} disabled={busy !== ""}>
                  {busy === "buy" ? <span className="spinner" aria-hidden /> : <Arrow />}
                  {me.stripe_enabled ? "Comprar entrevista" : "Liberar entrevista (teste)"}
                </button>
              ) : (
                <p className="alert alert-info">
                  {me.free_interview_testing ? "Você já usou os testes gratuitos desta conta." : "A compra de entrevistas individuais está pausada."}
                </p>
              )
            )}
            {needsAccess && me.kind === "member" && (
              <p className="alert alert-info">Sua entrevista pela empresa já foi usada. Fale com o RH se precisar de outra.</p>
            )}
            {restartable && (
              <button className={`btn ${canStart ? "" : "btn-primary"}`} onClick={() => restart(restartable)} disabled={busy !== ""}>
                {busy === "restart" ? "Reiniciando…" : "Recomeçar entrevista"}
              </button>
            )}
            <span className={s.credits}>
              {me.free_interview_testing && canStart ? "Testes disponíveis sem pagamento" :
                me.credits === 1 ? "1 entrevista disponível" : `${me.credits} entrevistas disponíveis`}
            </span>
          </div>
          {error && <p className="alert alert-error" role="alert">{error}</p>}
        </div>
        <ul className={s.prep} aria-label="Antes de começar">
          <li><Mic /><span><b>Microfone</b> Teste o sinal na sala antes de entrar. Use fone se puder.</span></li>
          <li><Captions /><span><b>Transcrição ao vivo</b> Acompanhe a conversa por escrito no painel da entrevista.</span></li>
          <li><Chat /><span><b>Cerca de 10 minutos</b> Histórias reais do seu trabalho e o que te dá energia. O Mapa rápido leva uns 3.</span></li>
        </ul>
      </section>

      <section aria-labelledby="hist" className={s.history}>
        <h2 id="hist">Seus perfis</h2>
        {interviews === null ? <p className="hint">Carregando…</p> : done.length === 0 ? (
          <p className={s.empty}>Seu perfil aparece aqui depois da primeira conversa, com cada tema grifado nas suas palavras.</p>
        ) : (
          <ul className={s.list}>
            {done.map((i) => (
              <li key={i.id}>
                <span className="stamp" data-s={i.status}>{STATUS[i.status]}</span>
                <span>{TEST_NAME[i.kind ?? "completa"]} · {new Date(i.ended_at ?? i.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span>
                <Link className="btn" href={`/app/perfil/${i.id}`}>Ver perfil <Arrow /></Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function Page() {
  return <Suspense><Home /></Suspense>;
}
