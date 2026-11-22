"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type Me } from "@/lib/api";
import { Wordmark } from "@/components/Wordmark";
import { Eye, EyeOff } from "@/components/icons";
import s from "../auth.module.css";

function Door() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(params.get("modo") === "cadastro" ? "signup" : "login");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    setBusy(true); setError("");
    try {
      const me = mode === "login"
        ? await api<Me>("/auth/login", { body: { email: form.email, password: form.password } })
        : await api<Me>("/auth/company/signup", { body: form });
      router.push(me.tenant && me.tenant.role !== "participant" ? (mode === "signup" ? "/app/empresa/cultura" : "/app/empresa") : "/app");
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  const signup = mode === "signup";
  return (
    <main className={s.main}>
      <div>
        <h1>{signup ? "Criar espaço da empresa" : "Entrar"}</h1>
        <p>{signup ? "Teste com 5 convites, sem cartão." : "Empresas e candidatos usam o mesmo acesso."}</p>
      </div>
      <form key={mode} className={s.form} onSubmit={submit} aria-busy={busy}>
        {signup && <div className="field"><label htmlFor="name">Seu nome</label><input id="name" name="name" required minLength={2} maxLength={160} autoComplete="name" /></div>}
        {signup && <div className="field"><label htmlFor="company">Empresa</label><input id="company" name="company" required minLength={2} maxLength={160} autoComplete="organization" /></div>}
        <div className="field"><label htmlFor="email">E-mail{signup ? " de trabalho" : ""}</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <div className={s.password}>
            <input id="password" name="password" type={show ? "text" : "password"} required minLength={signup ? 10 : 1}
                   autoComplete={signup ? "new-password" : "current-password"} autoCapitalize="none" spellCheck={false}
                   aria-describedby={signup ? "pwh" : undefined} />
            <button type="button" className={`icon-btn ${s.eye}`} aria-label={show ? "Ocultar senha" : "Mostrar senha"} aria-controls="password" onClick={() => setShow(!show)}>
              {show ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {signup && <span className="hint" id="pwh">Pelo menos 10 caracteres</span>}
        </div>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? <span className="spinner" aria-hidden /> : null}{signup ? "Criar espaço" : "Entrar"}</button>
      </form>
      <p className={s.switch}>
        {signup ? <>Já tem conta? <button type="button" onClick={() => { setMode("login"); setError(""); }}>Entrar</button></>
          : <>Sua empresa ainda não usa? <button type="button" onClick={() => { setMode("signup"); setError(""); }}>Criar espaço</button></>}
      </p>
    </main>
  );
}

export default function Page() {
  return (
    <div className={s.page}>
      <header className={s.top}><Link href="/" aria-label="Resona, página inicial"><Wordmark /></Link></header>
      <Suspense><Door /></Suspense>
    </div>
  );
}
