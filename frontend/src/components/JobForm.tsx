"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, DOMAINS, type Catalog, type DomainId, type Job, type JobInput, type JobSkill } from "@/lib/api";
import { Check, Plus, Sparkle } from "./icons";
import { Tip } from "./Tip";
import s from "@/app/app/empresa/company.module.css";

const EMPTY: JobInput = {
  title: "", description: "", soft_skills: [], profile: { fazer: 50, gente: 50, pensar: 50, forca: 50 },
  profile_note: "", test: "completa", status: "open",
};
const DOMAIN_TIP: Record<DomainId, string> = {
  fazer: "Entrega, ritmo, organização e senso de dono.",
  gente: "Relacionamento, influência, cuidado com pessoas.",
  pensar: "Análise, curiosidade, criatividade e aprendizado.",
  forca: "Calma sob pressão, persistência e propósito.",
};

export function JobForm({ job }: { job?: Job }) {
  const router = useRouter();
  const [form, setForm] = useState<JobInput>(job ? {
    title: job.title, description: job.description, soft_skills: job.soft_skills, profile: job.profile,
    profile_note: job.profile_note, test: job.test, status: job.status,
  } : EMPTY);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "suggest">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { api<Catalog>("/hiring/catalog").then(setCatalog).catch(() => undefined); }, []);

  const set = <K extends keyof JobInput>(key: K, value: JobInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const picked = (name: string) => form.soft_skills.find((x) => x.name.toLowerCase() === name.toLowerCase());

  /** Clique alterna: fora → essencial → desejável → fora. */
  function cycle(skill: { id: string; name: string }) {
    const current = picked(skill.name);
    if (!current) {
      if (form.soft_skills.length >= 12) return;
      set("soft_skills", [...form.soft_skills, { id: skill.id, name: skill.name, level: "essencial" }]);
    } else if (current.level === "essencial") {
      set("soft_skills", form.soft_skills.map((x) => (x === current ? { ...x, level: "desejavel" } : x)));
    } else {
      set("soft_skills", form.soft_skills.filter((x) => x !== current));
    }
  }

  async function suggest() {
    if (form.title.trim().length < 2) { setError("Escreva o título da vaga para a IA sugerir."); return; }
    setBusy("suggest"); setError(""); setNote("");
    try {
      const out = await api<{ soft_skills: JobSkill[]; profile: JobInput["profile"]; profile_note: string; method: string }>(
        "/tenant/jobs/suggest", { body: { title: form.title, description: form.description } });
      setForm((f) => ({ ...f, soft_skills: out.soft_skills, profile: out.profile, profile_note: out.profile_note || f.profile_note }));
      setNote(out.method === "ai" ? "Sugestão da IA aplicada. Ajuste o que quiser." : "Sugestão pelo título e descrição. Ajuste o que quiser.");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.soft_skills.length) { setError("Escolha pelo menos uma soft skill."); return; }
    setBusy("save"); setError("");
    try {
      const out = job
        ? await api<Job>(`/tenant/jobs/${job.id}`, { method: "PUT", body: form })
        : await api<Job>("/tenant/jobs", { body: form });
      router.push(`/app/empresa/vagas/${out.id}`);
    } catch (e) { setError((e as Error).message); setBusy(""); }
  }

  const extra = form.soft_skills.filter((x) => !catalog?.soft_skills.some((c) => c.name.toLowerCase() === x.name.toLowerCase()));

  return (
    <form className={s.form} onSubmit={save} noValidate>
      <div className={s.formCol}>
        <div className="field">
          <label htmlFor="title">Título da vaga</label>
          <input id="title" required minLength={2} maxLength={160} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Analista de Customer Success" />
        </div>
        <div className="field">
          <label htmlFor="desc">Descrição e responsabilidades</label>
          <textarea id="desc" rows={8} maxLength={20000} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Cole a descrição da vaga" />
        </div>
        <div>
          <button type="button" className="btn" onClick={suggest} disabled={busy !== ""}>
            {busy === "suggest" ? <span className="spinner" aria-hidden /> : <Sparkle />}Sugerir com IA
          </button>
          <Tip>Preenche soft skills e perfil a partir do título e da descrição. Você revisa antes de salvar.</Tip>
          <p role="status" className="hint" style={{ marginTop: 8 }}>{note}</p>
        </div>
        <div className="field">
          <span className="label">Entrevista</span>
          <div className={s.segmented} role="group" aria-label="Duração da entrevista">
            <button type="button" aria-pressed={form.test === "completa"} onClick={() => set("test", "completa")}>Completa · 10 min</button>
            <button type="button" aria-pressed={form.test === "rapida"} onClick={() => set("test", "rapida")}>Rápida · 3 min</button>
          </div>
        </div>
        {job && (
          <div className="field">
            <span className="label">Situação</span>
            <div className={s.segmented} role="group" aria-label="Situação da vaga">
              <button type="button" aria-pressed={form.status === "open"} onClick={() => set("status", "open")}>Aberta</button>
              <button type="button" aria-pressed={form.status === "closed"} onClick={() => set("status", "closed")}>Encerrada</button>
            </div>
          </div>
        )}
      </div>

      <div className={s.formCol}>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 12 }}>
          <legend className="label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            Soft skills <Tip>Clique uma vez para essencial, de novo para desejável, e outra para tirar. Essenciais pesam o dobro.</Tip>
          </legend>
          <div className={s.skillPick}>
            {(catalog?.soft_skills ?? []).map((skill) => {
              const p = picked(skill.name);
              return (
                <button key={skill.id} type="button" className="chip" title={skill.hint} aria-pressed={Boolean(p)} data-level={p?.level}
                        onClick={() => cycle(skill)} aria-label={`${skill.name}${p ? `, ${p.level === "essencial" ? "essencial" : "desejável"}` : ""}`}>
                  {p ? <Check /> : null}{skill.name}
                </button>
              );
            })}
            {extra.map((skill) => (
              <button key={skill.name} type="button" className="chip" aria-pressed data-level={skill.level} onClick={() => cycle(skill)}>
                <Check />{skill.name}
              </button>
            ))}
          </div>
          <div className={s.row}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="custom" className="sr-only">Outra soft skill</label>
              <input id="custom" value={custom} maxLength={80} placeholder="Outra soft skill"
                     onChange={(e) => setCustom(e.target.value)}
                     onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (custom.trim().length >= 2) { cycle({ id: "", name: custom.trim() }); setCustom(""); } } }} />
            </div>
            <button type="button" className="btn" disabled={custom.trim().length < 2} onClick={() => { cycle({ id: "", name: custom.trim() }); setCustom(""); }}><Plus />Adicionar</button>
          </div>
          <p className={s.legend}><span><i />Essencial</span><span><i data-dashed />Desejável</span></p>
        </fieldset>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            Perfil comportamental <Tip>Quanto cada domínio importa nesta vaga. Só a falta pesa: ter mais do que o pedido não tira pontos.</Tip>
          </legend>
          <div className={s.sliders}>
            {(Object.keys(DOMAINS) as DomainId[]).map((d) => (
              <div key={d} className={s.slider}>
                <label htmlFor={`p-${d}`}>{DOMAINS[d].name}<Tip>{DOMAIN_TIP[d]}</Tip></label>
                <output htmlFor={`p-${d}`}>{form.profile[d]}</output>
                <input id={`p-${d}`} type="range" min={0} max={100} step={5} value={form.profile[d]}
                       style={{ "--fill": `${form.profile[d]}%` } as React.CSSProperties}
                       onChange={(e) => set("profile", { ...form.profile, [d]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <div className="field" style={{ marginTop: 20 }}>
            <label htmlFor="pnote">Observação sobre o perfil <span className="hint">(opcional)</span></label>
            <input id="pnote" maxLength={2000} value={form.profile_note} onChange={(e) => set("profile_note", e.target.value)} placeholder="Ex.: ritmo alto, muito contato com cliente" />
          </div>
        </fieldset>
      </div>

      <div className={s.formFoot}>
        <button className="btn btn-primary btn-lg" disabled={busy !== ""}>{busy === "save" ? <span className="spinner" aria-hidden /> : null}{job ? "Salvar vaga" : "Criar vaga"}</button>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancelar</button>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
      </div>
    </form>
  );
}
