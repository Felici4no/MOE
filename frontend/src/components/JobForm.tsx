"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, DOMAINS, type Catalog, type DomainId, type Job, type JobInput, type JobSkill } from "@/lib/api";
import type { MoeScenario } from "@/lib/moe/api";
import { Check, Plus, Sparkle } from "./icons";
import { Tip } from "./Tip";
import s from "@/app/app/empresa/company.module.css";

const EMPTY: JobInput = {
  title: "", description: "", soft_skills: [], hard_skills: [], assessment: "entrevista", scenario_id: null,
  profile: { fazer: 50, gente: 50, pensar: 50, forca: 50 }, profile_note: "", test: "completa", status: "open",
};
const DOMAIN_TIP: Record<DomainId, string> = {
  fazer: "Entrega, ritmo, organização e senso de dono.",
  gente: "Relacionamento, influência, cuidado com pessoas.",
  pensar: "Análise, curiosidade, criatividade e aprendizado.",
  forca: "Calma sob pressão, persistência e propósito.",
};
type Kind = "soft_skills" | "hard_skills";
type Item = { id: string; name: string; hint: string };

/** Chips do catálogo + itens próprios. Clique: fora → essencial → desejável → fora. */
function SkillPicker({ kind, label, tip, value, catalog, onChange }: {
  kind: Kind; label: string; tip: string; value: JobSkill[]; catalog: Item[]; onChange: (next: JobSkill[]) => void;
}) {
  const [custom, setCustom] = useState("");
  const picked = (name: string) => value.find((x) => x.name.toLowerCase() === name.toLowerCase());
  function cycle(skill: { id: string; name: string }) {
    const current = picked(skill.name);
    if (!current) { if (value.length < 12) onChange([...value, { id: skill.id, name: skill.name, level: "essencial" }]); }
    else if (current.level === "essencial") onChange(value.map((x) => (x === current ? { ...x, level: "desejavel" } : x)));
    else onChange(value.filter((x) => x !== current));
  }
  const extra = value.filter((x) => !catalog.some((c) => c.name.toLowerCase() === x.name.toLowerCase()));
  const add = () => { if (custom.trim().length >= 2) { cycle({ id: "", name: custom.trim() }); setCustom(""); } };
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 12 }}>
      <legend className="label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>{label} <Tip>{tip}</Tip></legend>
      <div className={s.skillPick}>
        {catalog.map((skill) => {
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
          <label htmlFor={`custom-${kind}`} className="sr-only">Outra {label.toLowerCase()}</label>
          <input id={`custom-${kind}`} value={custom} maxLength={80} placeholder={kind === "hard_skills" ? "Outra hard skill (ex.: SQL)" : "Outra soft skill"}
                 onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        </div>
        <button type="button" className="btn" disabled={custom.trim().length < 2} onClick={add}><Plus />Adicionar</button>
      </div>
    </fieldset>
  );
}

export function JobForm({ job }: { job?: Job }) {
  const router = useRouter();
  const [form, setForm] = useState<JobInput>(job ? {
    title: job.title, description: job.description, soft_skills: job.soft_skills, hard_skills: job.hard_skills ?? [],
    assessment: job.assessment ?? "entrevista", scenario_id: job.scenario_id ?? null, profile: job.profile,
    profile_note: job.profile_note, test: job.test, status: job.status,
  } : EMPTY);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [scenarios, setScenarios] = useState<MoeScenario[]>([]);
  const [busy, setBusy] = useState<"" | "save" | "suggest">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<Catalog>("/hiring/catalog").then(setCatalog).catch(() => undefined);
    api<MoeScenario[]>("/moe/scenarios").then(setScenarios).catch(() => undefined);
  }, []);

  const set = <K extends keyof JobInput>(key: K, value: JobInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function suggest() {
    if (form.title.trim().length < 2) { setError("Escreva o título da vaga para a IA sugerir."); return; }
    setBusy("suggest"); setError(""); setNote("");
    try {
      const out = await api<{ soft_skills: JobSkill[]; hard_skills: JobSkill[]; profile: JobInput["profile"]; profile_note: string; method: string }>(
        "/tenant/jobs/suggest", { body: { title: form.title, description: form.description } });
      setForm((f) => ({ ...f, soft_skills: out.soft_skills, hard_skills: out.hard_skills?.length ? out.hard_skills : f.hard_skills,
        profile: out.profile, profile_note: out.profile_note || f.profile_note }));
      setNote(out.method === "ai" ? "Sugestão da IA aplicada. Ajuste o que quiser." : "Sugestão pelo título e descrição. Ajuste o que quiser.");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.soft_skills.length) { setError("Escolha pelo menos uma soft skill."); return; }
    if (form.assessment === "simulacao" && !form.scenario_id) { setError("Escolha a simulação do escritório."); return; }
    setBusy("save"); setError("");
    try {
      const out = job
        ? await api<Job>(`/tenant/jobs/${job.id}`, { method: "PUT", body: form })
        : await api<Job>("/tenant/jobs", { body: form });
      router.push(`/app/empresa/vagas/${out.id}`);
    } catch (e) { setError((e as Error).message); setBusy(""); }
  }

  return (
    <form className={s.form} onSubmit={save} noValidate>
      <div className={s.formCol}>
        <div className="field">
          <label htmlFor="title">Título da vaga</label>
          <input id="title" required minLength={2} maxLength={160} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Product Manager" />
        </div>
        <div className="field">
          <label htmlFor="desc">Descrição e responsabilidades</label>
          <textarea id="desc" rows={8} maxLength={20000} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Cole a descrição da vaga" />
        </div>
        <div>
          <button type="button" className="btn" onClick={suggest} disabled={busy !== ""}>
            {busy === "suggest" ? <span className="spinner" aria-hidden /> : <Sparkle />}Sugerir com IA
          </button>
          <Tip>Preenche soft skills, hard skills e perfil a partir do título e da descrição. Você revisa antes de salvar.</Tip>
          <p role="status" className="hint" style={{ marginTop: 8 }}>{note}</p>
        </div>
        <div className="field">
          <span className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}>Avaliação
            <Tip>Entrevista: conversa por voz com a Lia. Simulação: o candidato conversa no escritório com personagens do time, da gerência e da diretoria.</Tip></span>
          <div className={s.segmented} role="group" aria-label="Tipo de avaliação">
            <button type="button" aria-pressed={form.assessment === "entrevista"} onClick={() => set("assessment", "entrevista")}>Entrevista com a Lia</button>
            <button type="button" aria-pressed={form.assessment === "simulacao"} onClick={() => set("assessment", "simulacao")}>Simulação no escritório</button>
          </div>
        </div>
        {form.assessment === "entrevista" ? (
          <div className="field">
            <span className="label">Duração</span>
            <div className={s.segmented} role="group" aria-label="Duração da entrevista">
              <button type="button" aria-pressed={form.test === "completa"} onClick={() => set("test", "completa")}>Completa · 10 min</button>
              <button type="button" aria-pressed={form.test === "rapida"} onClick={() => set("test", "rapida")}>Rápida · 3 min</button>
            </div>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="scenario">Simulação</label>
            <select id="scenario" value={form.scenario_id ?? ""} onChange={(e) => set("scenario_id", e.target.value || null)}>
              <option value="">Escolha um cenário</option>
              {scenarios.map((sc) => <option key={sc.id} value={sc.id}>{sc.title}{sc.status === "published" ? "" : " (rascunho)"}</option>)}
            </select>
            {scenarios.length === 0 && <span className="hint">Crie um cenário em Simulações primeiro.</span>}
          </div>
        )}
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
        <SkillPicker kind="soft_skills" label="Soft skills" value={form.soft_skills} catalog={catalog?.soft_skills ?? []}
                     tip="Comportamentos. Clique uma vez para essencial, de novo para desejável, e outra para tirar. Essenciais pesam o dobro."
                     onChange={(v) => set("soft_skills", v)} />
        <SkillPicker kind="hard_skills" label="Hard skills" value={form.hard_skills} catalog={catalog?.hard_skills ?? []}
                     tip="Conhecimentos técnicos do cargo. A análise procura evidência deles no que a pessoa diz."
                     onChange={(v) => set("hard_skills", v)} />
        <p className={s.legend}><span><i />Essencial</span><span><i data-dashed />Desejável</span></p>

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
