"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Wordmark } from "@/components/Wordmark";
import s from "../auth.module.css";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    setBusy(true); setError("");
    try { await api("/leads", { body: { ...form, people: Number(form.people || 0) } }); setSent(true); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className={s.page}>
      <header className={s.top}><Link href="/" aria-label="MOE, página inicial"><Wordmark /></Link></header>
      <main className={s.main}>
        <div>
          <h1>Falar com vendas</h1>
          <p>Plano Enterprise: volume, integrações e contrato sob medida.</p>
        </div>
        {sent ? (
          <div className={s.done} role="status">
            <p className="alert alert-ok">Recebemos seu contato. O time comercial responde por e-mail.</p>
            <Link className="btn" href="/">Voltar ao início</Link>
          </div>
        ) : (
          <form className={s.form} onSubmit={submit}>
            <div className="field"><label htmlFor="l-name">Nome</label><input id="l-name" name="name" required minLength={2} autoComplete="name" /></div>
            <div className="field"><label htmlFor="l-email">E-mail de trabalho</label><input id="l-email" name="email" type="email" required autoComplete="email" /></div>
            <div className="field"><label htmlFor="l-company">Empresa</label><input id="l-company" name="company" required minLength={2} autoComplete="organization" /></div>
            <div className="field"><label htmlFor="l-people">Candidatos por mês</label><input id="l-people" name="people" type="number" min={0} inputMode="numeric" /></div>
            <div className="field"><label htmlFor="l-msg">Mensagem <span className="hint">(opcional)</span></label><textarea id="l-msg" name="message" rows={4} maxLength={2000} /></div>
            {error && <p className="alert alert-error" role="alert">{error}</p>}
            <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? <span className="spinner" aria-hidden /> : null}Enviar</button>
          </form>
        )}
      </main>
    </div>
  );
}
