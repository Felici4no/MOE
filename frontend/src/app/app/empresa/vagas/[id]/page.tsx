"use client";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api, DOMAINS, fileToPayload, type Candidate, type DomainId, type Evidence, type ImportResult, type Ranking, type SendResult } from "@/lib/api";
import { STAGE, STAGE_TIP } from "@/lib/labels";
import { useAdmin } from "@/lib/useAdmin";
import { Chevron, Close, Copy, Plus, Send, Settings, Trash, Upload } from "@/components/icons";
import { Tip } from "@/components/Tip";
import s from "../../company.module.css";

type Filter = "todos" | "analisados" | "andamento" | "pendentes";
const FILTERS: { id: Filter; label: string; test: (c: Candidate) => boolean }[] = [
  { id: "todos", label: "Todos", test: () => true },
  { id: "analisados", label: "Analisados", test: (c) => c.stage === "analyzed" },
  { id: "andamento", label: "Em andamento", test: (c) => ["invited", "accepted", "interviewing"].includes(c.stage) },
  { id: "pendentes", label: "Sem convite", test: (c) => c.stage === "imported" || c.stage === "expired" },
];
const HIGH = 80;
const initials = (c: Candidate) => (c.name || c.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

function Items({ items }: { items: Evidence[] }) {
  if (!items.length) return <p className="hint">Nada configurado.</p>;
  return (
    <ul className={s.items}>
      {[...items].sort((a, b) => b.score - a.score).map((e) => (
        <li key={e.label}>
          <span>{e.label}<em>{e.score}</em></span>
          <span className={s.bar} aria-hidden><i style={{ width: `${e.score}%` }} /></span>
          {e.quote ? <small><q>{e.quote}</q></small> : <small data-none>Sem evidência na conversa</small>}
        </li>
      ))}
    </ul>
  );
}

function Detail({ c, expected }: { c: Candidate; expected: Ranking["job"]["profile"] }) {
  const fit = c.fit!;
  return (
    <div className={s.detail} id={`d-${c.id}`}>
      <p className={s.summary}>{fit.summary}</p>
      {fit.differentials.length > 0 && (
        <div>
          <h3 className="sr-only">Diferenciais</h3>
          <ul className={s.diffs}>
            {fit.differentials.map((d) => <li key={d.quote}><b>{d.title}</b><q>{d.quote}</q></li>)}
          </ul>
        </div>
      )}
      <div className={s.detailGrid}>
        <section>
          <h3>Cultura · {fit.culture}</h3>
          <Items items={fit.culture_detail} />
        </section>
        <section>
          <h3>Soft skills · {fit.soft_skills}</h3>
          <Items items={fit.skills_detail} />
        </section>
        <section>
          <h3>Perfil · {fit.profile}<Tip side="end">Barra: evidência na conversa. Traço azul: o que a vaga pede.</Tip></h3>
          <ul className={s.items}>
            {(Object.keys(DOMAINS) as DomainId[]).map((d) => (
              <li key={d} className={s.domain}>
                <span>{DOMAINS[d].name}<em>{fit.profile_detail[d]} / {expected[d]}</em></span>
                <span className={s.dual} aria-label={`${DOMAINS[d].name}: ${fit.profile_detail[d]} de evidência, a vaga pede ${expected[d]}`}>
                  <i style={{ width: `${fit.profile_detail[d]}%` }} /><b style={{ left: `calc(${expected[d]}% - 1px)` }} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className={s.method}>{fit.method === "ai" ? "Análise por IA" : "Análise por sinais da conversa"} · as citações são falas literais do candidato · use como apoio, não como decisão única</p>
    </div>
  );
}

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const admin = useAdmin();
  const [data, setData] = useState<Ranking | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [open, setOpen] = useState<string | null>(null);
  const [panel, setPanel] = useState<"" | "add">("");
  const [busy, setBusy] = useState("");
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [sent, setSent] = useState<SendResult | null>(null);
  const [copied, setCopied] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try { setData(await api<Ranking>(`/tenant/jobs/${id}`)); } catch (e) { setError((e as Error).message); }
  }, [id]);
  useEffect(() => { if (admin) void load(); }, [admin, load]);

  const pending = useMemo(() => data?.candidates.filter((c) => c.stage === "imported" || c.stage === "expired").length ?? 0, [data]);
  const shown = data?.candidates.filter(FILTERS.find((f) => f.id === filter)!.test) ?? [];
  const maxBucket = Math.max(1, ...(data?.distribution.map((b) => b.count) ?? [1]));
  const analyzed = data?.candidates.filter((c) => c.fit) ?? [];
  const aboveHigh = analyzed.filter((c) => c.fit!.overall >= HIGH).length;

  async function run<T>(key: string, fn: () => Promise<T>) {
    setBusy(key); setError("");
    try { return await fn(); } catch (e) { setError((e as Error).message); return undefined; } finally { setBusy(""); }
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    setSent(null);
    const out = await run("import", async () => api<ImportResult>(`/tenant/jobs/${id}/import`, { body: await fileToPayload(f) }));
    if (out) { setImported(out); await load(); }
  }

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = Object.fromEntries(new FormData(formEl)) as Record<string, string>;
    const out = await run("add", () => api<Candidate>(`/tenant/jobs/${id}/candidates`, { body: form }));
    if (out) { formEl.reset(); await load(); }
  }

  async function send(ids?: string[]) {
    setImported(null);
    const out = await run(ids ? `send-${ids[0]}` : "send", () => api<SendResult>(`/tenant/jobs/${id}/send`, { body: { candidate_ids: ids ?? null } }));
    if (out) { setSent(out); await load(); }
  }

  async function remove(c: Candidate) {
    if (!window.confirm(`Tirar ${c.name || c.email} da vaga? O convite, se houver, deixa de valer.`)) return;
    if (await run(`rm-${c.id}`, () => api(`/tenant/jobs/${id}/candidates/${c.id}`, { method: "DELETE" })) !== undefined) await load();
  }

  async function copy(link: string) {
    await navigator.clipboard.writeText(link).catch(() => undefined);
    setCopied(link);
  }

  if (!admin) return null;
  if (!data) return <div className={s.page}>{error ? <p className="alert alert-error" role="alert">{error}</p> : <p className="hint" role="status">Carregando…</p>}</div>;
  const { job } = data;

  return (
    <div className={s.page}>
      <header className={s.jobHead}>
        <Link className={s.crumb} href="/app/empresa">← Vagas</Link>
        <div className={s.headRow}>
          <div>
            <h1>{job.title}{job.status === "closed" && <span className={s.closed} style={{ marginLeft: 12, verticalAlign: "middle" }}>Encerrada</span>}</h1>
            <div className={s.chips}>
              {job.soft_skills.map((k) => <span key={k.name} className="chip" data-level={k.level} title={k.level === "essencial" ? "Essencial" : "Desejável"}>{k.name}</span>)}
            </div>
          </div>
          <Link className="btn" href={`/app/empresa/vagas/${id}/editar`}><Settings />Editar vaga</Link>
        </div>
      </header>

      <div className={s.overview}>
        <section className={`${s.panel} ${s.stats}`} aria-label="Andamento da vaga">
          <div><b>{job.funnel.imported}</b><span>na lista</span></div>
          <div><b>{job.funnel.invited}</b><span>convidados</span></div>
          <div><b>{job.funnel.started}</b><span>entrevistados</span></div>
          <div><b>{job.funnel.analyzed}</b><span>analisados</span></div>
        </section>
        <section className={`${s.panel} ${s.dist}`} aria-labelledby="dist">
          <div className={s.distHead}>
            <h2 id="dist">Distribuição do fit
              <Tip>Fit geral = {Math.round(data.weights.culture * 100)}% cultura + {Math.round(data.weights.profile * 100)}% perfil + {Math.round(data.weights.soft_skills * 100)}% soft skills. Em azul, {HIGH} ou mais.</Tip>
            </h2>
            <span>{analyzed.length ? `mediana ${data.median} · ${aboveHigh} acima de ${HIGH}` : "aguardando entrevistas"}</span>
          </div>
          <div className={s.hist} role="img" aria-label={`Distribuição: ${data.distribution.filter((b) => b.count).map((b) => `${b.count} entre ${b.start} e ${b.end}`).join(", ") || "sem candidatos analisados"}`}>
            {data.distribution.map((b) => (
              <div key={b.start} data-high={b.start >= HIGH || undefined} data-zero={!b.count || undefined} title={`${b.start}–${b.end}: ${b.count}`}>
                <i style={{ height: `${b.count ? Math.max(8, (b.count / maxBucket) * 100) : 2}%` }} />
              </div>
            ))}
          </div>
          <div className={s.axis}><span>0</span><span>50</span><span>100</span></div>
        </section>
      </div>

      <section aria-labelledby="cands" style={{ display: "grid", gap: 16 }}>
        <div className={s.toolbar}>
          <h2 id="cands" className="sr-only">Candidatos</h2>
          <div className={s.filters} role="group" aria-label="Filtrar candidatos">
            {FILTERS.map((f) => (
              <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}<em>{data.candidates.filter(f.test).length}</em>
              </button>
            ))}
          </div>
          <span className={s.spacer} />
          <button className="btn btn-sm" onClick={() => file.current?.click()} disabled={busy !== ""}>
            {busy === "import" ? <span className="spinner" aria-hidden /> : <Upload />}Importar planilha
          </button>
          <Tip side="end">Excel (.xlsx) ou CSV com colunas de nome e e-mail. Repetidos são ignorados.</Tip>
          <input ref={file} type="file" className="sr-only" accept=".xlsx,.xlsm,.csv" tabIndex={-1} aria-hidden
                 onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          <button className="btn btn-sm" onClick={() => setPanel(panel === "add" ? "" : "add")} aria-expanded={panel === "add"}><Plus />Adicionar</button>
          <button className="btn btn-primary btn-sm" onClick={() => send()} disabled={!pending || busy !== "" || job.status === "closed"}>
            {busy === "send" ? <span className="spinner" aria-hidden /> : <Send />}Enviar convites{pending ? ` (${pending})` : ""}
          </button>
        </div>

        {error && <p className="alert alert-error" role="alert">{error}</p>}

        {panel === "add" && (
          <div className={s.sheet}>
            <div className={s.sheetHead}><h2>Adicionar candidato</h2><button className="icon-btn" aria-label="Fechar" onClick={() => setPanel("")}><Close /></button></div>
            <form className={s.addForm} onSubmit={add}>
              <div className="field"><label htmlFor="cname">Nome</label><input id="cname" name="name" maxLength={160} autoComplete="off" /></div>
              <div className="field"><label htmlFor="cemail">E-mail</label><input id="cemail" name="email" type="email" required autoComplete="off" /></div>
              <button className="btn btn-primary" disabled={busy === "add"}>{busy === "add" ? <span className="spinner" aria-hidden /> : <Plus />}Adicionar</button>
            </form>
          </div>
        )}

        {imported && (
          <div className={s.sheet} role="status">
            <div className={s.sheetHead}>
              <h2>{imported.added} {imported.added === 1 ? "candidato adicionado" : "candidatos adicionados"}{imported.duplicates ? ` · ${imported.duplicates} repetido${imported.duplicates > 1 ? "s" : ""}` : ""}</h2>
              <button className="icon-btn" aria-label="Fechar" onClick={() => setImported(null)}><Close /></button>
            </div>
            {imported.rejected.length > 0 && (
              <div className={s.rejected}>
                <b>{imported.rejected.length} linha{imported.rejected.length > 1 ? "s" : ""} com problema</b>
                {imported.rejected.slice(0, 6).map((r) => <span key={r.row}>Linha {r.row}: {r.reason}{r.value ? ` (${r.value})` : ""}</span>)}
              </div>
            )}
            {imported.added > 0 && pending > 0 && <div><button className="btn btn-primary btn-sm" onClick={() => send()} disabled={busy !== ""}><Send />Enviar {pending} convite{pending > 1 ? "s" : ""} agora</button></div>}
          </div>
        )}

        {sent && (
          <div className={s.sheet} role="status">
            <div className={s.sheetHead}>
              <h2>{sent.sent} convite{sent.sent !== 1 ? "s" : ""} enviado{sent.sent !== 1 ? "s" : ""}{sent.emailed ? ` · ${sent.emailed} por e-mail` : ""}</h2>
              <button className="icon-btn" aria-label="Fechar" onClick={() => setSent(null)}><Close /></button>
            </div>
            {sent.message && <p className="alert alert-info">{sent.message}</p>}
            {sent.links.length > 0 && (
              <>
                <p className={s.muted}>Sem e-mail configurado: copie cada link. Eles só aparecem agora.</p>
                <ul className={s.links}>
                  {sent.links.map((l) => (
                    <li key={l.link}>
                      <code title={l.link}><b>{l.name || l.email}</b> · {l.link}</code>
                      <button className="btn btn-sm btn-ghost" onClick={() => copy(l.link)}><Copy />{copied === l.link ? "Copiado" : "Copiar"}</button>
                    </li>
                  ))}
                </ul>
                <button className="btn btn-sm" style={{ justifySelf: "start" }} onClick={() => copy(sent.links.map((l) => `${l.name || l.email}\t${l.email}\t${l.link}`).join("\n"))}>
                  <Copy />Copiar todos
                </button>
              </>
            )}
          </div>
        )}

        {data.candidates.length === 0 ? (
          <div className={s.empty}>
            <h2>Nenhum candidato ainda</h2>
            <p>Importe uma planilha com nome e e-mail. Cada pessoa recebe um link para criar a conta e conversar com a Lia.</p>
            <button className="btn btn-primary" onClick={() => file.current?.click()}><Upload />Importar planilha</button>
          </div>
        ) : shown.length === 0 ? <p className={s.muted}>Ninguém neste filtro.</p> : (
          <ol className={s.list}>
            {shown.map((c, n) => {
              const isOpen = open === c.id && Boolean(c.fit);
              return (
                <li key={c.id} className={s.cand}>
                  <div className={s.candRow} data-open={isOpen || undefined}>
                    <span className={s.rank}>{c.fit ? n + 1 : ""}</span>
                    <span className={s.avatar} aria-hidden>{initials(c)}</span>
                    <span className={s.who}><b>{c.name || c.email}</b>{c.name && <span>{c.email}</span>}</span>
                    {c.fit ? (
                      <>
                        <span className={s.axes} aria-label={`Cultura ${c.fit.culture}, perfil ${c.fit.profile}, soft skills ${c.fit.soft_skills}`}>
                          {([["Cultura", c.fit.culture], ["Perfil", c.fit.profile], ["Soft skills", c.fit.soft_skills]] as const).map(([label, v]) => (
                            <span key={label} className={s.axis3}><span>{label}<b>{v}</b></span><span className={s.bar}><i style={{ width: `${v}%` }} /></span></span>
                          ))}
                        </span>
                        <span className={s.score} data-high={c.fit.overall >= HIGH || undefined} aria-label={`Fit geral ${c.fit.overall}`}>{c.fit.overall}</span>
                        <button className="icon-btn" aria-expanded={isOpen} aria-controls={`d-${c.id}`} aria-label={`${isOpen ? "Fechar" : "Ver"} análise de ${c.name || c.email}`}
                                onClick={() => setOpen(isOpen ? null : c.id)} style={{ transform: isOpen ? "rotate(180deg)" : undefined }}>
                          <Chevron />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={s.stageCell}>
                          <span className="stamp" data-s={c.stage}>{STAGE[c.stage]}</span>
                          <Tip side="end">{STAGE_TIP[c.stage]}</Tip>
                          {(c.stage === "imported" || c.stage === "expired") && job.status === "open" && (
                            <button className="btn btn-sm btn-ghost" onClick={() => send([c.id])} disabled={busy !== ""}>
                              {busy === `send-${c.id}` ? <span className="spinner" aria-hidden /> : null}{c.stage === "expired" ? "Reenviar" : "Convidar"}
                            </button>
                          )}
                        </span>
                        <button className="icon-btn" aria-label={`Tirar ${c.name || c.email} da vaga`} onClick={() => remove(c)} disabled={busy !== ""}><Trash /></button>
                      </>
                    )}
                  </div>
                  {isOpen && <Detail c={c} expected={job.profile} />}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
