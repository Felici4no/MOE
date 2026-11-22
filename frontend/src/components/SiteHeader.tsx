"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { Close, Menu } from "./icons";
import s from "@/app/landing.module.css";

const LINKS = [
  { href: "#como", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#planos", label: "Planos" },
  { href: "#duvidas", label: "Dúvidas" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <header className={s.header} data-open={open || undefined}>
      <div className={s.headerInner}>
        <Link href="/" aria-label="MOE, página inicial"><Wordmark /></Link>
        <nav id="site-nav" className={s.nav} aria-label="Principal">
          <ul>{LINKS.map((l) => <li key={l.href}><a href={l.href} onClick={() => setOpen(false)}>{l.label}</a></li>)}</ul>
          <div className={s.navActions}>
            <Link className={s.signIn} href="/entrar">Entrar</Link>
            <Link className="btn btn-primary btn-sm" href="/entrar?modo=cadastro">Criar espaço</Link>
          </div>
        </nav>
        <button type="button" className={`icon-btn ${s.menuBtn}`} aria-expanded={open} aria-controls="site-nav"
                aria-label={open ? "Fechar menu" : "Abrir menu"} onClick={() => setOpen(!open)}>
          {open ? <Close /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
