"use client";
import Link from "next/link";
import { JobForm } from "@/components/JobForm";
import { useAdmin } from "@/lib/useAdmin";
import s from "../../company.module.css";

export default function NewJob() {
  const admin = useAdmin();
  if (!admin) return null;
  return (
    <div className={s.page}>
      <header className={s.jobHead}>
        <Link className={s.crumb} href="/app/empresa">← Vagas</Link>
        <h1 style={{ fontSize: 32 }}>Nova vaga</h1>
      </header>
      <JobForm />
    </div>
  );
}
