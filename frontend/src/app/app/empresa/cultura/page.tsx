"use client";
import { useEffect, useRef, useState } from "react";
import { api, fileToPayload, type Catalog, type Culture, type CultureValue } from "@/lib/api";
import { useAdmin } from "@/lib/useAdmin";
import { Close, Plus, Sparkle, Upload } from "@/components/icons";
import { Tip } from "@/components/Tip";
import s from "../company.module.css";

const METHOD: Record<string, string> = { ai: "Valores extraídos pela IA", catalog: "Valores reconhecidos no texto", manual: "Valores editados por você" };

export default function CulturePage() {
  const admin = useAdmin();
  const [culture, setCulture] = useState<Culture | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [text, setText] = useState("");
  const [values, setValues] = useState<CultureValue[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "file" | "text" | "values">("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function apply(c: Culture) {
    setCulture(c); setText(c.text); setValues(c.values); setDirty(false);
  }

  useEffect(() => {
    if (!admin) return;
    api<Culture>("/tenant/culture").then(apply).catch((e) => setError(e.message));
    api<Catalog>("/hiring/catalog").then(setCatalog).catch(() => undefined);
  }, [admin]);

  async function save(kind: "file" | "text" | "values", body: unknown, note: string) {
    setBusy(kind); setError(""); setSaved("");
    try { apply(await api<Culture>("/tenant/culture", { method: "PUT", body })); setSaved(note); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    await save("file", { file: await fileToPayload(file) }, "Arquivo lido e valores atualizados.");
  }

  function edit(i: number, patch: Partial<CultureValue>) {
    setValues((v) => v.map((x, n) => (n === i ? { ...x, ...patch } : x))); setDirty(true); setSaved("");
  }

  const unused = catalog?.culture_values.filter((c) => !values.some((v) => v.name.toLowerCase() === c.name.toLowerCase())) ?? [];

  return (
    <div className={s.page}>
      <header className="page-head">
        <div>
          <h1>Cultura</h1>
          <p>Base do fit cultural em todas as vagas.</p>
        </div>
      </header>
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      {culture === null ? <p className="hint" role="status">Carregando…</p> : (
        <div className={s.cultureGrid}>
          <section className={`${s.panel} ${s.panelPad}`} aria-labelledby="src">
            <h2 id="src" className={s.sectionTitle}>Documento da cultura
              <Tip>Manifesto, código de cultura, página de carreiras. A IA lê o texto e sugere os valores ao lado.</Tip></h2>
            <div style={{ marginTop: 16 }}>
              <label
                className={s.drop} data-over={over || undefined}
                onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); void upload(e.dataTransfer.files[0]); }}
              >
                {busy === "file" ? <span className="spinner" aria-hidden /> : <Upload />}
                <b>{busy === "file" ? "Lendo o arquivo…" : "Enviar arquivo"}</b>
                <span>PDF, DOCX, TXT ou MD · até 5 MB</span>
                <input ref={input} type="file" className="sr-only" accept=".pdf,.docx,.txt,.md" disabled={busy !== ""}
                       onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {culture.source_name && <p className={s.source} style={{ marginTop: 10 }}>Arquivo atual: <b>{culture.source_name}</b></p>}
            </div>
            <p className={s.or}>ou cole o texto</p>
            <div className="field">
              <label htmlFor="ctext" className="sr-only">Texto da cultura</label>
              <textarea id="ctext" rows={9} value={text} maxLength={40000} placeholder="Ex.: Aqui o cliente está no centro. Decidimos em time e cada pessoa age como dona do que faz…"
                        onChange={(e) => setText(e.target.value)} />
            </div>
            <div className={s.row} style={{ marginTop: 12 }}>
              <button className="btn" disabled={busy !== "" || text.trim() === culture.text.trim() || !text.trim()}
                      onClick={() => save("text", { text }, "Texto salvo e valores atualizados.")}>
                {busy === "text" ? <span className="spinner" aria-hidden /> : <Sparkle />}Extrair valores
              </button>
            </div>
          </section>

          <section className={`${s.panel} ${s.panelPad}`} aria-labelledby="vals">
            <div className={s.row} style={{ justifyContent: "space-between" }}>
              <h2 id="vals" className={s.sectionTitle}>Valores
                <Tip side="end">O fit cultural de cada candidato é medido contra esta lista. Edite nomes e descrições à vontade.</Tip></h2>
              {culture.method && !dirty && <span className={s.muted}>{METHOD[culture.method]}</span>}
            </div>
            {values.length === 0 ? (
              <p className={s.muted} style={{ marginTop: 16 }}>Nenhum valor ainda. Envie o documento ou escolha abaixo.</p>
            ) : (
              <ul className={s.values} style={{ marginTop: 16 }}>
                {values.map((v, i) => (
                  <li key={i} className={s.value}>
                    <input aria-label={`Nome do valor ${i + 1}`} value={v.name} maxLength={80} onChange={(e) => edit(i, { name: e.target.value })} />
                    <button className="icon-btn" aria-label={`Remover ${v.name}`} onClick={() => { setValues(values.filter((_, n) => n !== i)); setDirty(true); }}><Close /></button>
                    <textarea aria-label={`Descrição de ${v.name}`} rows={2} value={v.description} maxLength={300} placeholder="Comportamento esperado"
                              onChange={(e) => edit(i, { description: e.target.value })} />
                  </li>
                ))}
              </ul>
            )}
            {unused.length > 0 && values.length < 12 && (
              <div style={{ marginTop: 20 }}>
                <p className={s.muted} style={{ marginBottom: 8 }}>Adicionar</p>
                <div className={s.suggest}>
                  {unused.map((c) => (
                    <button key={c.id} className="chip" title={c.hint}
                            onClick={() => { setValues([...values, { id: c.id, name: c.name, description: c.hint }]); setDirty(true); setSaved(""); }}>
                      <Plus />{c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className={s.row} style={{ marginTop: 20 }}>
              <button className="btn btn-primary" disabled={!dirty || busy !== "" || values.some((v) => v.name.trim().length < 2)}
                      onClick={() => save("values", { text: culture.text, values }, "Valores salvos.")}>
                {busy === "values" ? <span className="spinner" aria-hidden /> : null}Salvar valores
              </button>
              <p role="status" className={s.muted}>{saved}</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
