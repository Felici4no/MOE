"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Wordmark } from "@/components/Wordmark";
import { Arrow, Chat, Headphones } from "@/components/icons";
import s from "./invite.module.css";

type Preview = { company: string; email: string; name: string; job: string | null; has_account: boolean; tests: { id: string; name: string; minutes: string; description: string }[] };

export default function AcceptInvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<Preview>(`/auth/invites/${token}`).then(setPreview).catch((e) => setError(e.message)); }, [token]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      await api("/auth/invites/accept", { body: { token, name: form.get("name") ?? "", password: form.get("password"), consent: form.get("consent") === "on" } });
      router.push("/app");
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  const minutes = preview?.tests.map((t) => t.minutes).join(" + ");

  return (
    <main className={s.page}>
      <Wordmark />
      {!preview ? (
        error ? <p className="alert alert-error" role="alert">{error}</p> : <p role="status" className="hint">Abrindo convite…</p>
      ) : (
        <section className={s.card} aria-labelledby="t">
          <div>
            <span className="eyebrow">{preview.company}</span>
            <h1 id="t">{preview.job ? preview.job : "Convite para uma conversa"}</h1>
          </div>
          <ul className={s.facts}>
            <li><Chat />Entrevista por voz com a Lia · {minutes}</li>
            <li><Headphones />Fone e microfone num lugar tranquilo</li>
          </ul>
          <form className={s.form} onSubmit={submit}>
            <div className="field"><label htmlFor="email">E-mail</label><input id="email" value={preview.email} readOnly /></div>
            {!preview.has_account && (
              <div className="field"><label htmlFor="name">Seu nome</label><input id="name" name="name" defaultValue={preview.name} required minLength={2} autoComplete="name" /></div>
            )}
            <div className="field">
              <label htmlFor="password">{preview.has_account ? "Senha da sua conta Resona" : "Crie uma senha"}</label>
              <input id="password" name="password" type="password" required minLength={preview.has_account ? 1 : 10}
                     autoComplete={preview.has_account ? "current-password" : "new-password"} aria-describedby={preview.has_account ? undefined : "pwh"} />
              {!preview.has_account && <span className="hint" id="pwh">Pelo menos 10 caracteres</span>}
            </div>
            {preview.job && (
              <label className={s.consent}>
                <input type="checkbox" name="consent" required />
                <span>Autorizo {preview.company} a ver a análise de fit desta vaga, com trechos do que eu disser. A transcrição completa e o áudio não são compartilhados, e posso retirar a autorização depois.</span>
              </label>
            )}
            {error && <p className="alert alert-error" role="alert">{error}</p>}
            <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? <span className="spinner" aria-hidden /> : null}Aceitar convite <Arrow /></button>
          </form>
        </section>
      )}
    </main>
  );
}
