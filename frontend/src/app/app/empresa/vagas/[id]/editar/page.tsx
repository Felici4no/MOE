"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Ranking } from "@/lib/api";
import { JobForm } from "@/components/JobForm";
import { useAdmin } from "@/lib/useAdmin";
import s from "../../../company.module.css";

export default function EditJob({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const admin = useAdmin();
  const [data, setData] = useState<Ranking | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (admin) api<Ranking>(`/tenant/jobs/${id}`).then(setData).catch((e) => setError(e.message)); }, [admin, id]);
  return (
    <div className={s.page}>
      <header className={s.jobHead}>
        <Link className={s.crumb} href={`/app/empresa/vagas/${id}`}>← {data?.job.title ?? "Vaga"}</Link>
        <h1 style={{ fontSize: 32 }}>Editar vaga</h1>
      </header>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {data ? <JobForm job={data.job} /> : !error && <p className="hint" role="status">Carregando…</p>}
    </div>
  );
}
