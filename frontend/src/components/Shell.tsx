"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError, type Me } from "@/lib/api";
import { Wordmark } from "./Wordmark";
import { Briefcase, Card, Chart, Chat, Compass, Exit, Home } from "./icons";
import s from "./Shell.module.css";

const MeContext = createContext<{ me: Me; refresh: () => Promise<void> } | null>(null);

export function useMe() {
  const value = useContext(MeContext);
  if (!value) throw new Error("useMe fora do Shell");
  return value;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setMe(await api<Me>("/me"));
    } catch (exc) {
      if (exc instanceof ApiError && exc.status === 401) router.replace("/entrar");
      else setError(exc instanceof Error ? exc.message : "Falha ao carregar.");
    }
  }, [router]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/");
  }

  if (!me) {
    return (
      <div className={s.loading} role="status">
        {error ? <p className="alert alert-error">{error}</p> : <><span className="spinner" aria-hidden /> Carregando</>}
      </div>
    );
  }

  const admin = me.tenant && me.tenant.role !== "participant";
  const items = admin ? [
    { href: "/app/empresa", label: "Vagas", icon: <Briefcase />, match: (p: string) => p === "/app/empresa" || p.startsWith("/app/empresa/vagas") },
    { href: "/app/empresa/cultura", label: "Cultura", icon: <Compass /> },
    { href: "/app/empresa/moe", label: "Simulações", icon: <Chat />, match: (p: string) => p.startsWith("/app/empresa/moe") },
    { href: "/app/empresa/analises", label: "Análises", icon: <Chart /> },
    { href: "/app/empresa/plano", label: "Plano", icon: <Card /> },
  ] : [{ href: "/app", label: "Minhas vagas", icon: <Home /> }, { href: "/app/moe", label: "Simulações", icon: <Chat /> }];
  const inRoom = path.startsWith("/app/entrevista/");
  const active = (item: (typeof items)[number]) => ("match" in item && item.match ? item.match(path) : path === item.href);

  return (
    <MeContext.Provider value={{ me, refresh }}>
      <div className={s.shell} data-room={inRoom || undefined}>
        <nav className={s.rail} aria-label="Principal">
          <Link href={admin ? "/app/empresa" : "/app"} className={s.brand} aria-label="MOE, início"><Wordmark /></Link>
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} aria-current={active(item) ? "page" : undefined}>{item.icon}<span className={s.label}>{item.label}</span></Link>
              </li>
            ))}
            {inRoom && <li><span aria-current="page" className={s.current}><Chat />Entrevista</span></li>}
          </ul>
          <div className={s.who}>
            <p className={s.name}>{me.name}</p>
            <p className={s.org}>{me.tenant?.name ?? ""}</p>
            <button className={s.logout} onClick={logout} aria-label="Sair"><Exit /><span className={s.label}>Sair</span></button>
          </div>
        </nav>
        <main className={s.main} id="conteudo">{children}</main>
      </div>
    </MeContext.Provider>
  );
}
