"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Available } from "@/lib/moe/api";
import s from "../empresa/moe/moe-admin.module.css";

type Mine = { id: string; title: string; status: "playing" | "finished"; answered: number; scenes: number; share_with_tenant: boolean; created_at: string };

/** Participante: simulações publicadas pela empresa e as próprias sessões. */
export default function MoeParticipant() {
  const [available, setAvailable] = useState<Available[] | null>(null);
  const [mine, setMine] = useState<Mine[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<Available[]>("/moe/play/scenarios"), api<Mine[]>("/moe/play/sessions")])
      .then(([a, m]) => { setAvailable(a); setMine(m); })
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <div className={s.page}>
      <header className={s.head}>
        <p className={s.kicker}>MOE / MYOFFICEEXPERIENCE</p>
        <h1>Simulações do escritório</h1>
        <p>Situações fictícias de trabalho com personagens. Não é prova e não tem nota. A leitura é sua; a empresa só vê o que você decidir compartilhar.</p>
      </header>
      {error && <p className={s.error} role="alert">{error}</p>}
      <section aria-labelledby="disp">
        <h2 id="disp" className={s.sectionH}>Disponíveis</h2>
        {available === null ? <p className={s.empty}>Carregando…</p> : available.length === 0 ? (
          <p className={s.empty}>Sua empresa ainda não publicou simulações. Enquanto isso, <Link href="/moe">experimente a demonstração</Link>.</p>
        ) : (
          <ul className={s.cards}>
            {available.map((x) => (
              <li key={x.id} className={s.card}>
                <div className={s.cardHead}><h3>{x.title}</h3><span className={s.badge}>{x.scenes} cenas</span></div>
                {x.description && <p>{x.description}</p>}
                <div className={s.actions}><Link className="btn btn-primary" href={`/moe?cenario=${x.id}`}>Entrar no escritório</Link></div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {mine.length > 0 && (
        <section aria-labelledby="minhas">
          <h2 id="minhas" className={s.sectionH}>Minhas simulações</h2>
          <ul className={s.cards}>
            {mine.map((x) => (
              <li key={x.id} className={s.card}>
                <div className={s.cardHead}>
                  <h3>{x.title}</h3>
                  <span className={x.status === "finished" ? s.badgeOn : s.badge}>{x.status === "finished" ? "Concluída" : `Em andamento · ${x.answered}/${x.scenes}`}</span>
                  {x.share_with_tenant && <span className={s.badge}>Compartilhada</span>}
                </div>
                <div className={s.actions}><Link className="btn" href={`/moe?sessao=${x.id}`}>{x.status === "finished" ? "Ver leitura" : "Continuar"}</Link></div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
