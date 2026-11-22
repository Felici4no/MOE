import Link from 'next/link';
import { getDemoReport } from '@/lib/demo/fixtures';
import { codigoDocumento, formatarData } from '@/lib/domain/report';
import { fingerprint } from '@/lib/ascii/core';
import { DemoTag } from '@/components/relatorio/ReportParts';

function Sheet({ children, n, className }: { children: React.ReactNode; n: string; className?: string }) {
  return (
    <div className={`relative flex aspect-[210/297] flex-col border-2 border-ink bg-surface p-[clamp(14px,2vw,22px)] shadow-[6px_6px_0_var(--shadow)] ${className ?? ''}`}>
      {children}
      <p className="meta mt-auto flex justify-between border-t border-ink pt-2 text-[10px]"><span>Mapa de Talentos</span><span>{n}</span></p>
    </div>
  );
}

/** 05 — O DOCUMENTO: prévia realista com dados sintéticos. */
export function DocumentPreview() {
  const doc = getDemoReport('demo-tres')!;
  const r = doc.relatorio!;
  const fp = fingerprint(doc.id, 30, 9).join('\n');
  return (
    <section id="documento" aria-labelledby="documento-title" className="section scroll-mt-4 border-t-2 border-ink bg-muted">
      <div className="shell grid-12 gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-4">
          <p className="meta meta-soft">05 / O documento</p>
          <h2 id="documento-title" className="display-l mt-5 uppercase">Um documento, não um placar.</h2>
          <p className="mt-6 max-w-[44ch] text-ink-soft">
            Cada pessoa recebe uma publicação própria: capa, índice, até três talentos com as suas palavras, até dois caminhos e o que ainda está em descoberta. Sem pontos, sem ranking, sem medalhas.
          </p>
          <ul className="mt-8 border-t-2 border-ink">
            {['Capa e índice', 'Seus talentos, com evidências literais', 'Seus caminhos', 'Ainda em descoberta', 'Método, limites e privacidade'].map((t, i) => (
              <li key={t} className="flex gap-4 border-b border-ink py-3"><span className="meta pt-1">{String(i + 1).padStart(2, '0')}</span>{t}</li>
            ))}
          </ul>
          <div className="mt-8"><DemoTag /></div>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/relatorio/demo-tres" className="btn btn-primary">Abrir o exemplo</Link>
            <a href="/api/relatorios/demo-tres/pdf" className="btn" download>Baixar PDF de exemplo</a>
          </div>
        </div>

        <div className="col-span-4 md:col-span-8 lg:col-span-8 grid gap-6 sm:grid-cols-3 sm:items-start" aria-label="Prévia das páginas do relatório de exemplo, com dados fictícios" role="group">
          <Sheet n="01">
            <p className="meta text-[9px]">Documento pessoal · {codigoDocumento(doc.id)}</p>
            <p className="font-display mt-4 text-[clamp(1.2rem,2.2vw,1.9rem)] font-bold uppercase leading-[0.9] tracking-tight">Mapa de{' '}<br />Talentos</p>
            <pre className="ascii mt-4 text-[clamp(5px,0.65vw,8px)] leading-[1.05]" aria-hidden="true">{fp}</pre>
            <p className="font-display mt-4 text-base font-bold leading-tight"><span className="mark">{doc.participantName}</span></p>
            <dl className="mt-3 space-y-1 text-[10px] leading-snug">
              <div className="flex gap-2"><dt className="meta w-16 shrink-0 text-[9px]">Projeto</dt><dd>{doc.projectName}</dd></div>
              <div className="flex gap-2"><dt className="meta w-16 shrink-0 text-[9px]">Org.</dt><dd>{doc.clientName}</dd></div>
              <div className="flex gap-2"><dt className="meta w-16 shrink-0 text-[9px]">Data</dt><dd>{formatarData(doc.createdAt)}</dd></div>
            </dl>
          </Sheet>
          <Sheet n="03" className="sm:mt-12">
            <p className="meta text-[9px]">02 / Seus talentos</p>
            <p className="font-mono mt-3 text-2xl leading-none">02.1</p>
            <p className="meta mt-2 text-[9px]">{r.talentos[0].dominio}</p>
            <p className="font-display text-lg font-bold leading-tight">{r.talentos[0].tema}</p>
            <span className="tag tag-signal mt-2 self-start !text-[9px]">{r.talentos[0].confianca} · {r.talentos[0].evidencias.length} evidências</span>
            <p className="mt-3 text-[11px] leading-snug">{r.talentos[0].frase}</p>
            <div className="mt-3 border-2 border-on-signal bg-signal p-2 text-[10px] leading-snug text-on-signal">“{r.talentos[0].evidencias[0]}”</div>
            <div className="mt-2 border-2 border-ink p-2 text-[10px] leading-snug">“{r.talentos[0].evidencias[1]}”</div>
          </Sheet>
          <Sheet n="06" className="sm:mt-24">
            <p className="meta text-[9px]">03 / Seus caminhos</p>
            {r.caminhos.map(c => (
              <p key={c.caminho} className="font-display mt-2 border-b border-ink pb-2 text-sm font-bold leading-tight">{c.caminho}</p>
            ))}
            <p className="meta mt-5 text-[9px]">04 / Ainda em descoberta</p>
            <p className="font-display mt-2 text-lg font-bold">{r.em_descoberta?.tema}</p>
            <p className="mt-2 border-l-4 border-ink pl-2 text-[11px] leading-snug">{r.em_descoberta?.convite}</p>
            <p className="mt-3 text-[10px] leading-snug text-ink-soft">Ainda em descoberta não é fraqueza.</p>
          </Sheet>
        </div>
      </div>
    </section>
  );
}
