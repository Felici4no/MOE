"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Culture, type Job } from "@/lib/api";
import { useAdmin } from "@/lib/useAdmin";
import { Compass, Plus } from "@/components/icons";
import { Tip } from "@/components/Tip";
import s from "./company.module.css";

const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export default function Jobs() {
  const admin = useAdmin();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [culture, setCulture] = useState<Culture | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!admin) return;
    Promise.all([api<Job[]>("/tenant/jobs"), api<Culture>("/tenant/culture")])
      .then(([j, c]) => { setJobs(j); setCulture(c); })
      .catch((e) => setError(e.message));
  }, [admin]);

  const open = jobs?.filter((j) => j.status === "open") ?? [];
  const closed = jobs?.filter((j) => j.status === "closed") ?? [];

  return (
    <div className={s.page}>
      <header className="page-head">
        <div>
          <h1>Vagas</h1>
          {jobs && jobs.length > 0 && <p>{open.length} {open.length === 1 ? "aberta" : "abertas"}{closed.length ? ` · ${closed.length} encerrada${closed.length > 1 ? "s" : ""}` : ""}</p>}
        </div>
        <Link className="btn btn-primary" href="/app/empresa/vagas/nova"><Plus />Nova vaga</Link>
      </header>

      {error && <p className="alert alert-error" role="alert">{error}</p>}

      {culture && culture.values.length === 0 && (
        <div className={s.nudge}>
          <Compass />
          <p>Suba a cultura da empresa para o ranking considerar o fit cultural.</p>
          <Link className="btn btn-sm" href="/app/empresa/cultura">Adicionar cultura</Link>
        </div>
      )}

      {jobs === null ? <p className="hint" role="status">Carregando…</p> : jobs.length === 0 ? (
        <div className={s.empty}>
          <h2>Crie a primeira vaga</h2>
          <p>Descreva a vaga, escolha as soft skills e o perfil esperado, depois envie a entrevista para a lista de candidatos.</p>
          <Link className="btn btn-primary" href="/app/empresa/vagas/nova"><Plus />Nova vaga</Link>
        </div>
      ) : (
        <ul className={s.jobs}>
          {[...open, ...closed].map((job) => (
            <li key={job.id} className={s.job}>
              <div className={s.jobTop}>
                <div>
                  <h2><Link href={`/app/empresa/vagas/${job.id}`}>{job.title}</Link></h2>
                  <p className={s.jobMeta}>Criada em {fmt(job.created_at)} · {job.soft_skills.length} soft skills</p>
                </div>
                {job.status === "closed" && <span className={s.closed}>Encerrada</span>}
              </div>
              <div className={s.funnel}>
                <div><b>{job.funnel.imported}</b><span>na lista</span></div>
                <div><b>{job.funnel.invited}</b><span>convidados</span></div>
                <div><b>{job.funnel.started}</b><span>entrevistados</span></div>
                <div><b>{job.funnel.analyzed}</b><span>analisados</span></div>
              </div>
              <p className={s.top}>
                {job.top_fit === null ? "Sem análises ainda" : <>Maior fit <b>{job.top_fit}</b><Tip>Fit geral de 0 a 100: cultura, perfil comportamental e soft skills.</Tip></>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
