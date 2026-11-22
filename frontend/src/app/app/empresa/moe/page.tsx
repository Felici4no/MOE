"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { api } from "@/lib/api";
import { useMe } from "@/components/Shell";
import type { MoeCatalog, MoePersona, MoePoint, MoeScenario, MoeScene, SharedResult, Stance, Tone, VoiceTone } from "@/lib/moe/api";
import { POSTURA, TOM } from "@/lib/moe/script";
import s from "./moe-admin.module.css";

type Tab = "cenarios" | "pontos" | "personagens" | "resultados";
const TABS: [Tab, string][] = [["cenarios", "Cenários"], ["pontos", "Pontos"], ["personagens", "Personagens"], ["resultados", "Resultados compartilhados"]];

export default function MoeAdmin() {
  const { me } = useMe();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("cenarios");
  const [catalog, setCatalog] = useState<MoeCatalog | null>(null);
  const [points, setPoints] = useState<MoePoint[]>([]);
  const [personas, setPersonas] = useState<MoePersona[]>([]);
  const [scenarios, setScenarios] = useState<MoeScenario[]>([]);
  const [results, setResults] = useState<SharedResult[]>([]);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    try {
      const [c, p, pe, sc, r] = await Promise.all([
        api<MoeCatalog>("/moe/catalog"), api<MoePoint[]>("/moe/points"), api<MoePersona[]>("/moe/personas"),
        api<MoeScenario[]>("/moe/scenarios"), api<SharedResult[]>("/moe/results")]);
      setCatalog(c); setPoints(p); setPersonas(pe); setScenarios(sc); setResults(r);
    } catch (e) { setError((e as Error).message); }
  }, []);

  useEffect(() => {
    if (!me.tenant || me.tenant.role === "participant") { router.replace("/app"); return; }
    void load();
  }, [me, router, load]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setError(""); setFlash("");
    try { await fn(); await load(); setFlash(ok); return true; }
    catch (e) { setError((e as Error).message); return false; }
  }

  return (
    <div className={s.page}>
      <header className={s.head}>
        <p className={s.kicker}>MOE / MYOFFICEEXPERIENCE</p>
        <h1>Simulações do escritório</h1>
        <p>Defina os pontos que quer explorar, dê voz e personalidade aos personagens e ajuste a situação. A leitura de cada simulação é da pessoa; a empresa só vê o que ela decidir compartilhar.</p>
        <Link href="/app/empresa" className={s.back}>← Voltar para a empresa</Link>
      </header>

      <div role="tablist" aria-label="Seções" className={s.tabs}>
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)}>
            {label}{id === "resultados" && results.length ? ` (${results.length})` : ""}
          </button>
        ))}
      </div>

      {error && <p className={s.error} role="alert">{error}</p>}
      {flash && !error && <p className={s.flash} role="status">{flash}</p>}

      <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {!catalog ? <p className={s.empty}>Carregando…</p>
          : tab === "cenarios" ? <Scenarios catalog={catalog} scenarios={scenarios} points={points} personas={personas} run={run} />
          : tab === "pontos" ? <Points points={points} run={run} />
          : tab === "personagens" ? <Personas catalog={catalog} personas={personas} run={run} />
          : <Results results={results} />}
      </section>
    </div>
  );
}

type Run = (fn: () => Promise<unknown>, ok: string) => Promise<boolean>;

/* ----------------------------------- Cenários ----------------------------------- */

const emptyScenario = (personas: MoePersona[]): Omit<MoeScenario, "id" | "status" | "version" | "published_at" | "dirty" | "cast_size"> => ({
  title: "", description: "", pressure: 3, tone: "neutro", point_ids: [],
  scenes: [{ id: "", persona_id: personas[0]?.id ?? "", line: "", point_ids: [] }],
});

function Scenarios({ catalog, scenarios, points, personas, run }: { catalog: MoeCatalog; scenarios: MoeScenario[]; points: MoePoint[]; personas: MoePersona[]; run: Run }) {
  const [editing, setEditing] = useState<(ReturnType<typeof emptyScenario> & { id?: string }) | null>(null);
  const [copied, setCopied] = useState("");

  if (editing) {
    return <ScenarioForm catalog={catalog} value={editing} points={points} personas={personas}
      onCancel={() => setEditing(null)}
      onSave={async (v) => {
        const ok = await run(() => api(v.id ? `/moe/scenarios/${v.id}` : "/moe/scenarios", { method: v.id ? "PUT" : "POST", body: strip(v) }), "Cenário salvo.");
        if (ok) setEditing(null);
      }} />;
  }

  return (
    <div className={s.stack}>
      <div className={s.actions}>
        <button className="btn btn-primary" onClick={() => run(() => api("/moe/scenarios/from-template", { method: "POST" }), "Modelo S01 criado: pontos, personagens e cenário editáveis.")}>Começar pelo modelo “Entrega sob pressão”</button>
        <button className="btn" disabled={!personas.length} onClick={() => setEditing(emptyScenario(personas))}>Novo cenário</button>
        {!personas.length && <span className={s.hint}>Crie pelo menos um personagem para montar um cenário do zero.</span>}
      </div>
      {scenarios.length === 0 ? <p className={s.empty}>Nenhum cenário ainda.</p> : (
        <ul className={s.cards}>
          {scenarios.map((sc) => {
            const link = typeof window !== "undefined" ? `${window.location.origin}/moe?cenario=${sc.id}` : "";
            return (
              <li key={sc.id} className={s.card}>
                <div className={s.cardHead}>
                  <h3>{sc.title}</h3>
                  <span className={sc.status === "published" ? s.badgeOn : s.badge}>
                    {sc.status === "published" ? `Publicado · v${sc.version}` : "Rascunho"}
                  </span>
                  {sc.dirty && <span className={s.badgeWarn}>Alterações não publicadas</span>}
                </div>
                <p className={s.meta}>{sc.scenes.length} cenas · {sc.cast_size} personagens · pressão {catalog.pressure[String(sc.pressure)]} · clima {sc.tone}</p>
                <ol className={s.sceneList}>
                  {sc.scenes.map((x) => <li key={x.id}><b>{personas.find((p) => p.id === x.persona_id)?.name ?? "?"}</b> — {x.line}</li>)}
                </ol>
                <div className={s.actions}>
                  <button className="btn" onClick={() => setEditing({ ...sc })}>Editar</button>
                  {sc.status === "published" && !sc.dirty ? (
                    <button className="btn" onClick={() => run(() => api(`/moe/scenarios/${sc.id}/unpublish`, { method: "POST" }), "Cenário voltou para rascunho.")}>Despublicar</button>
                  ) : (
                    <button className="btn btn-primary" onClick={() => run(() => api(`/moe/scenarios/${sc.id}/publish`, { method: "POST" }), "Cenário publicado. Pessoas da empresa já podem jogar.")}>{sc.status === "published" ? "Publicar nova versão" : "Publicar"}</button>
                  )}
                  {sc.status === "published" && (
                    <button className="btn btn-ghost" onClick={() => { void navigator.clipboard?.writeText(link); setCopied(sc.id); }}>{copied === sc.id ? "Link copiado" : "Copiar link"}</button>
                  )}
                  <button className="btn btn-ghost" onClick={() => { if (confirm(`Excluir o cenário “${sc.title}”? Sessões já jogadas também serão removidas.`)) void run(() => api(`/moe/scenarios/${sc.id}`, { method: "DELETE" }), "Cenário excluído."); }}>Excluir</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function strip(v: ReturnType<typeof emptyScenario> & { id?: string }) {
  return { title: v.title, description: v.description, pressure: v.pressure, tone: v.tone, point_ids: v.point_ids,
    scenes: v.scenes.map((x) => ({ id: x.id, persona_id: x.persona_id, line: x.line, point_ids: x.point_ids })) };
}

function ScenarioForm({ catalog, value, points, personas, onSave, onCancel }: {
  catalog: MoeCatalog; value: ReturnType<typeof emptyScenario> & { id?: string }; points: MoePoint[]; personas: MoePersona[];
  onSave: (v: ReturnType<typeof emptyScenario> & { id?: string }) => void; onCancel: () => void;
}) {
  const [v, setV] = useState(value);
  const id = useId();
  const cast = new Set(v.scenes.map((x) => x.persona_id));
  const setScene = (i: number, patch: Partial<MoeScene>) => setV({ ...v, scenes: v.scenes.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const move = (i: number, d: number) => {
    const scenes = [...v.scenes]; const [x] = scenes.splice(i, 1); scenes.splice(i + d, 0, x); setV({ ...v, scenes });
  };
  const toggle = (list: string[], x: string) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

  return (
    <form className={s.form} onSubmit={(e) => { e.preventDefault(); onSave(v); }}>
      <h2>{v.id ? "Editar cenário" : "Novo cenário"}</h2>
      <div className="field"><label htmlFor={`${id}t`}>Título</label><input id={`${id}t`} required minLength={3} maxLength={120} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></div>
      <div className="field"><label htmlFor={`${id}d`}>Situação (contexto curto)</label><textarea id={`${id}d`} maxLength={400} rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></div>
      <div className={s.row}>
        <div className="field">
          <label htmlFor={`${id}p`}>Pressão: <b>{catalog.pressure[String(v.pressure)]}</b></label>
          <input id={`${id}p`} type="range" min={1} max={5} value={v.pressure} onChange={(e) => setV({ ...v, pressure: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label htmlFor={`${id}c`}>Clima</label>
          <select id={`${id}c`} value={v.tone} onChange={(e) => setV({ ...v, tone: e.target.value as Tone })}>
            {Object.entries(catalog.tones).map(([k, d]) => <option key={k} value={k}>{k} — {d}</option>)}
          </select>
        </div>
      </div>
      <fieldset className={s.fieldset}>
        <legend>Pontos que este cenário explora</legend>
        {points.length === 0 && <p className={s.hint}>Crie pontos na aba “Pontos”.</p>}
        <div className={s.chips}>
          {points.map((p) => (
            <label key={p.id} className={s.chip}><input type="checkbox" checked={v.point_ids.includes(p.id)} onChange={() => setV({ ...v, point_ids: toggle(v.point_ids, p.id) })} />{p.name} <small>peso {p.weight}</small></label>
          ))}
        </div>
      </fieldset>

      <h3>Cenas <small className={s.hint}>({v.scenes.length}/6 · {cast.size}/{catalog.max_cast} personagens no escritório)</small></h3>
      <ol className={s.scenes}>
        {v.scenes.map((x, i) => (
          <li key={i} className={s.sceneEdit}>
            <div className={s.row}>
              <div className="field">
                <label htmlFor={`${id}s${i}p`}>Quem fala na cena {i + 1}</label>
                <select id={`${id}s${i}p`} value={x.persona_id} onChange={(e) => setScene(i, { persona_id: e.target.value })}>
                  {personas.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
                </select>
              </div>
              <div className={s.sceneTools}>
                <button type="button" className="btn btn-ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Subir cena ${i + 1}`}>↑</button>
                <button type="button" className="btn btn-ghost" disabled={i === v.scenes.length - 1} onClick={() => move(i, 1)} aria-label={`Descer cena ${i + 1}`}>↓</button>
                <button type="button" className="btn btn-ghost" disabled={v.scenes.length === 1} onClick={() => setV({ ...v, scenes: v.scenes.filter((_, j) => j !== i) })}>Remover</button>
              </div>
            </div>
            <div className="field"><label htmlFor={`${id}s${i}l`}>Fala de abertura do personagem</label>
              <textarea id={`${id}s${i}l`} rows={2} required minLength={10} maxLength={400} value={x.line} onChange={(e) => setScene(i, { line: e.target.value })} /></div>
            <div className={s.chips} role="group" aria-label={`Pontos explorados na cena ${i + 1}`}>
              {points.filter((p) => v.point_ids.includes(p.id)).map((p) => (
                <label key={p.id} className={s.chip}><input type="checkbox" checked={x.point_ids.includes(p.id)} onChange={() => setScene(i, { point_ids: toggle(x.point_ids, p.id) })} />{p.name}</label>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <div className={s.actions}>
        <button type="button" className="btn" disabled={v.scenes.length >= 6} onClick={() => setV({ ...v, scenes: [...v.scenes, { id: "", persona_id: personas[0]?.id ?? "", line: "", point_ids: [] }] })}>Adicionar cena</button>
      </div>
      {cast.size > catalog.max_cast && <p className={s.error} role="alert">Use no máximo {catalog.max_cast} personagens diferentes.</p>}
      <div className={s.actions}>
        <button className="btn btn-primary" disabled={cast.size > catalog.max_cast}>Salvar cenário</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

/* ----------------------------------- Pontos ------------------------------------ */

function Points({ points, run }: { points: MoePoint[]; run: Run }) {
  const blank = { name: "", description: "", signals: "", weight: 3 };
  const [form, setForm] = useState<typeof blank & { id?: string }>(blank);
  const id = useId();
  return (
    <div className={s.split}>
      <form className={s.form} onSubmit={async (e) => {
        e.preventDefault();
        const body = { name: form.name, description: form.description, weight: form.weight, signals: form.signals.split("\n").map((x) => x.trim()).filter(Boolean) };
        if (await run(() => api(form.id ? `/moe/points/${form.id}` : "/moe/points", { method: form.id ? "PUT" : "POST", body }), "Ponto salvo.")) setForm(blank);
      }}>
        <h2>{form.id ? "Editar ponto" : "Novo ponto"}</h2>
        <div className="field"><label htmlFor={`${id}n`}>Nome</label><input id={`${id}n`} required minLength={2} maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label htmlFor={`${id}d`}>O que interessa observar</label><textarea id={`${id}d`} rows={2} maxLength={400} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="field"><label htmlFor={`${id}s`}>Sinais observáveis (um por linha, até 6)</label><textarea id={`${id}s`} rows={4} value={form.signals} onChange={(e) => setForm({ ...form, signals: e.target.value })} placeholder={"Pergunta pelo bloqueio antes de propor\nCombina próximos passos"} /></div>
        <div className="field">
          <label htmlFor={`${id}w`}>Peso: <b>{form.weight}</b> de 5</label>
          <input id={`${id}w`} type="range" min={1} max={5} value={form.weight} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} />
          <small className={s.hint}>Define a ordem de foco na leitura. Não é nota e não gera pontuação.</small>
        </div>
        <p className={s.hint}>Temas pessoais ou protegidos (religião, política, família, saúde, idade, origem…) são recusados.</p>
        <div className={s.actions}>
          <button className="btn btn-primary">Salvar ponto</button>
          {form.id && <button type="button" className="btn btn-ghost" onClick={() => setForm(blank)}>Cancelar</button>}
        </div>
      </form>
      <ul className={s.cards}>
        {points.length === 0 && <li className={s.empty}>Nenhum ponto ainda.</li>}
        {points.map((p) => (
          <li key={p.id} className={s.card}>
            <div className={s.cardHead}><h3>{p.name}</h3><span className={s.badge}>peso {p.weight}</span>{p.in_use && <span className={s.badgeOn}>em uso</span>}</div>
            {p.description && <p>{p.description}</p>}
            {p.signals.length > 0 && <ul className={s.signals}>{p.signals.map((x) => <li key={x}>{x}</li>)}</ul>}
            <div className={s.actions}>
              <button className="btn" onClick={() => setForm({ id: p.id, name: p.name, description: p.description, signals: p.signals.join("\n"), weight: p.weight })}>Editar</button>
              <button className="btn btn-ghost" disabled={p.in_use} title={p.in_use ? "Tire o ponto dos cenários antes de excluir" : undefined}
                onClick={() => run(() => api(`/moe/points/${p.id}`, { method: "DELETE" }), "Ponto excluído.")}>Excluir</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------- Personagens --------------------------------- */

function Personas({ catalog, personas, run }: { catalog: MoeCatalog; personas: MoePersona[]; run: Run }) {
  const blank = { name: "", role: "", traits: "", speaking_style: "", stance: "colaborativa" as Stance, voice_tone: "serena" as VoiceTone, voice_id: "", look: 1 };
  const [form, setForm] = useState<typeof blank & { id?: string }>(blank);
  const id = useId();
  const voices = catalog.voices.voices;
  return (
    <div className={s.split}>
      <form className={s.form} onSubmit={async (e) => {
        e.preventDefault();
        const body = { ...form, id: undefined, traits: form.traits.split(",").map((x) => x.trim()).filter(Boolean) };
        delete (body as { id?: string }).id;
        if (await run(() => api(form.id ? `/moe/personas/${form.id}` : "/moe/personas", { method: form.id ? "PUT" : "POST", body }), "Personagem salvo.")) setForm(blank);
      }}>
        <h2>{form.id ? "Editar personagem" : "Novo personagem"}</h2>
        <div className={s.row}>
          <div className="field"><label htmlFor={`${id}n`}>Nome</label><input id={`${id}n`} required minLength={2} maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label htmlFor={`${id}r`}>Papel no escritório</label><input id={`${id}r`} required minLength={2} maxLength={60} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Gestora, colega, cliente interno…" /></div>
        </div>
        <fieldset className={s.fieldset}>
          <legend>Personalidade</legend>
          <div className="field"><label htmlFor={`${id}t`}>Traços (separados por vírgula, até 5)</label><input id={`${id}t`} value={form.traits} onChange={(e) => setForm({ ...form, traits: e.target.value })} placeholder="organizada, calma sob pressão" /></div>
          <div className="field">
            <label htmlFor={`${id}st`}>Postura na conversa</label>
            <select id={`${id}st`} value={form.stance} onChange={(e) => setForm({ ...form, stance: e.target.value as Stance })}>
              {Object.entries(catalog.stances).map(([k, d]) => <option key={k} value={k}>{POSTURA[k as Stance]} — {d}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor={`${id}sp`}>Jeito de falar</label><textarea id={`${id}sp`} rows={2} maxLength={400} value={form.speaking_style} onChange={(e) => setForm({ ...form, speaking_style: e.target.value })} placeholder="Frases curtas, sempre fecha com uma pergunta aberta." /></div>
        </fieldset>
        <fieldset className={s.fieldset}>
          <legend>Voz</legend>
          <div className={s.row}>
            <div className="field">
              <label htmlFor={`${id}vt`}>Tom</label>
              <select id={`${id}vt`} value={form.voice_tone} onChange={(e) => setForm({ ...form, voice_tone: e.target.value as VoiceTone })}>
                {Object.entries(catalog.voice_tones).map(([k, d]) => <option key={k} value={k}>{TOM[k as VoiceTone]} — {d}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${id}vi`}>Voz do fornecedor ({catalog.voices.vendor})</label>
              <select id={`${id}vi`} value={form.voice_id} onChange={(e) => setForm({ ...form, voice_id: e.target.value })}>
                <option value="">Padrão do sistema</option>
                {voices.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </div>
          </div>
          <small className={s.hint}>Só aparecem vozes configuradas no servidor. A voz é usada quando a conversa por voz (Agora) estiver ativa.</small>
        </fieldset>
        <div className="field">
          <label htmlFor={`${id}l`}>Aparência no escritório (personagens do Pixel Agents)</label>
          <select id={`${id}l`} value={form.look} onChange={(e) => setForm({ ...form, look: Number(e.target.value) })}>
            {Object.entries(catalog.looks).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
        </div>
        <div className={s.actions}>
          <button className="btn btn-primary">Salvar personagem</button>
          {form.id && <button type="button" className="btn btn-ghost" onClick={() => setForm(blank)}>Cancelar</button>}
        </div>
      </form>
      <ul className={s.cards}>
        {personas.length === 0 && <li className={s.empty}>Nenhum personagem ainda.</li>}
        {personas.map((p) => (
          <li key={p.id} className={s.card}>
            <div className={s.cardHead}><h3>{p.name}</h3><span className={s.badge}>{p.role}</span>{p.in_use && <span className={s.badgeOn}>em uso</span>}</div>
            <p className={s.meta}>postura {POSTURA[p.stance]} · voz {TOM[p.voice_tone]}{p.voice_id ? ` · ${p.voice_id}` : " · voz padrão"}{p.voice_id && !p.voice_verified ? " (fora do catálogo atual)" : ""} · aparência {catalog.looks[String(p.look)]}</p>
            {p.traits.length > 0 && <p>{p.traits.join(" · ")}</p>}
            {p.speaking_style && <p className={s.quote}>“{p.speaking_style}”</p>}
            <div className={s.actions}>
              <button className="btn" onClick={() => setForm({ id: p.id, name: p.name, role: p.role, traits: p.traits.join(", "), speaking_style: p.speaking_style, stance: p.stance, voice_tone: p.voice_tone, voice_id: p.voice_id, look: p.look })}>Editar</button>
              <button className="btn btn-ghost" disabled={p.in_use} title={p.in_use ? "Troque o personagem nas cenas antes de excluir" : undefined}
                onClick={() => run(() => api(`/moe/personas/${p.id}`, { method: "DELETE" }), "Personagem excluído.")}>Excluir</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------- Resultados --------------------------------- */

function Results({ results }: { results: SharedResult[] }) {
  if (!results.length) return <p className={s.empty}>Ninguém compartilhou uma simulação ainda. Cada pessoa decide se e quando compartilhar a própria leitura.</p>;
  return (
    <ul className={s.cards}>
      {results.map((r) => (
        <li key={r.id} className={s.card}>
          <div className={s.cardHead}><h3>{r.person}</h3><span className={s.badge}>{r.scenario} · v{r.version}</span></div>
          <p className={s.notice}>{r.analysis.notice}</p>
          {r.analysis.points.map((p) => (
            <div key={p.point_id} className={s.reading}>
              <p><b>{p.name}</b> <small>peso {p.weight}</small></p>
              {p.signals.length > 0 && <p className={s.meta}>Sinais: {p.signals.join(" · ")}</p>}
              {p.quotes.length ? p.quotes.map((q) => <blockquote key={q}><mark>{q}</mark></blockquote>) : <p className={s.meta}>{p.note}</p>}
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}
