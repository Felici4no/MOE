"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Me } from "@/lib/api";
import { Arrow, Building, Eye, EyeOff, Person } from "./icons";
import s from "./AuthDoor.module.css";

type Mode = "login" | "signup";

const PORTALS = {
  individual: {
    title: "Individual",
    line: "Converse com a Lia e receba um perfil com evidências da entrevista.",
    signup: "Criar minha conta",
    cta: "Entrar",
    icon: Person,
  },
  empresa: {
    title: "Empresa",
    line: "Crie o espaço da sua organização, convide pessoas e acompanhe as entrevistas.",
    signup: "Criar espaço da empresa",
    cta: "Entrar como empresa",
    icon: Building,
  },
} as const;

type Portal = keyof typeof PORTALS;

export function AuthDoor({ initialPortal, initialMode }: { initialPortal: Portal; initialMode: Mode }) {
  const router = useRouter();
  const [portal, setPortal] = useState<Portal>(initialPortal);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const copy = PORTALS[portal];
  const id = (name: string) => `${portal}-${name}`;

  function selectPortal(next: Portal) {
    if (next === portal) return;
    setPortal(next);
    setShowPassword(false);
    setError("");
  }

  function selectMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setShowPassword(false);
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    setBusy(true);
    setError("");
    try {
      const me = mode === "login"
        ? await api<Me>("/auth/login", { body: { email: form.email, password: form.password, portal } })
        : await api<Me>(portal === "empresa" ? "/auth/company/signup" : "/auth/individual/signup", { body: form });
      router.push(me.tenant && me.tenant.role !== "participant" ? "/app/empresa" : "/app");
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Não foi possível continuar.");
      setBusy(false);
    }
  }

  return (
    <section className={s.door} aria-labelledby="access-title">
      <h2 id="access-title">Seu acesso</h2>
      <div className={s.portals} role="group" aria-label="Tipo de acesso">
        {(Object.keys(PORTALS) as Portal[]).map((key) => {
          const { title, icon: Icon } = PORTALS[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={portal === key}
              aria-controls="access-form"
              disabled={busy}
              onClick={() => selectPortal(key)}
            >
              <Icon />
              {title}
            </button>
          );
        })}
      </div>
      <p className={s.description} id="access-description">{copy.line}</p>
      <div className={s.switch} role="group" aria-label="Opções da conta">
        <button type="button" aria-pressed={mode === "login"} aria-controls="access-form" disabled={busy} onClick={() => selectMode("login")}>Já tenho conta</button>
        <button type="button" aria-pressed={mode === "signup"} aria-controls="access-form" disabled={busy} onClick={() => selectMode("signup")}>Criar conta</button>
      </div>
      <form key={portal} id="access-form" className={s.form} method="post" onSubmit={submit} aria-describedby="access-description" aria-busy={busy}>
        {mode === "signup" && (
          <div className="field">
            <label htmlFor={id("name")}>Seu nome</label>
            <input id={id("name")} name="name" autoComplete="name" required minLength={2} maxLength={160} />
          </div>
        )}
        {mode === "signup" && portal === "empresa" && (
          <div className="field">
            <label htmlFor={id("company")}>Nome da empresa</label>
            <input id={id("company")} name="company" autoComplete="organization" required minLength={2} maxLength={160} />
          </div>
        )}
        <div className="field">
          <label htmlFor={id("email")}>E-mail{portal === "empresa" ? " de trabalho" : ""}</label>
          <input id={id("email")} name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor={id("password")}>Senha</label>
          <div className={mode === "login" ? s.password : undefined}>
            <input
              id={id("password")}
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={mode === "signup" ? 10 : 1}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby={mode === "signup" ? id("pw-hint") : undefined}
            />
            {mode === "login" && (
              <button
                type="button"
                className={s.visibility}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-controls={id("password")}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            )}
          </div>
          {mode === "signup" && <span className="hint" id={id("pw-hint")}>Pelo menos 10 caracteres</span>}
        </div>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        <button className={`btn btn-primary ${s.submit}`} disabled={busy}>
          {busy ? <span className="spinner" aria-hidden /> : null}
          {busy ? "Aguarde…" : mode === "login" ? copy.cta : copy.signup}
          {!busy && <Arrow />}
        </button>
      </form>
    </section>
  );
}
