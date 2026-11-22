"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Wordmark } from "@/components/Wordmark";
import { Arrow } from "@/components/icons";
import s from "./invite.module.css";

type Preview = { company: string; email: string; name: string; tests: { id: string; name: string; minutes: string; description: string }[] };

export default function AcceptInvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<Preview>(`/auth/invites/${token}`).then(setPreview).catch((e) => setError(e.message)); }, [token]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    setBusy(true); setError("");
    try {
      await api("/auth/invites/accept", { body: { token, name: form.name, password: form.password } });
      router.push("/app");
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  return (
    <main className={s.page}>
      <Wordmark />
      {!preview ? (
        error ? <p className="alert alert-error" role="alert">{error}</p> : <p role="status" className="hint">Abrindo convite…</p>
      ) : (
        <section className={s.card} aria-labelledby="t">
          <h1 id="t">{preview.company} convidou você para uma conversa.</h1>
          <p>Você vai conversar por voz com a Lia, a entrevistadora do Mapa de Talentos. O resultado é seu: você decide se a empresa vê os seus talentos.</p>
          <ul className={s.tests} aria-label="Testes deste convite">
            {preview.tests.map((t) => <li key={t.id}><b>{t.name}</b> <span>{t.minutes}</span><p>{t.description}</p></li>)}
          </ul>
          <p className="hint">Use fone e microfone num lugar tranquilo. Se a conexão cair, você tem até 3 tentativas por teste.</p>
          <form className={s.form} onSubmit={submit}>
            <div className="field"><label htmlFor="email">E-mail</label><input id="email" value={preview.email} readOnly /></div>
            <div className="field"><label htmlFor="name">Seu nome</label><input id="name" name="name" defaultValue={preview.name} required minLength={2} autoComplete="name" /></div>
            <div className="field">
              <label htmlFor="password">Crie uma senha</label>
              <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" aria-describedby="pwh" />
              <span className="hint" id="pwh">Pelo menos 10 caracteres.</span>
            </div>
            {error && <p className="alert alert-error" role="alert">{error}</p>}
            <button className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" aria-hidden /> : null}Aceitar convite <Arrow /></button>
          </form>
        </section>
      )}
    </main>
  );
}
