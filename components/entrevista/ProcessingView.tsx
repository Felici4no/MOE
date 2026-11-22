'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AsciiProcessing } from '@/components/ascii';

type StepStatus = 'aguardando' | 'andamento' | 'ok' | 'demonstrativa' | 'erro';
interface Step { id: 'transcricao' | 'analise' | 'validacao' | 'documento'; label: string; status: StepStatus; detalhe?: string }

const BASE: Step[] = [
  { id: 'transcricao', label: 'Transcrição', status: 'aguardando' },
  { id: 'analise', label: 'Análise', status: 'aguardando' },
  { id: 'validacao', label: 'Validação', status: 'aguardando' },
  { id: 'documento', label: 'Documento', status: 'aguardando' },
];

const STATUS_TXT: Record<StepStatus, string> = {
  aguardando: 'aguardando', andamento: 'em andamento', ok: 'concluída', demonstrativa: 'demonstrativa', erro: 'falhou',
};

export interface ProcessingPayload {
  modo: 'demo' | 'real';
  turnos?: number;
  transcricao?: string;
  falas: number;
}

/**
 * Transição para o relatório. As etapas só avançam com respostas REAIS do servidor;
 * a animação nunca indica conclusão de algo que falhou.
 */
export function ProcessingView({ payload, onBack }: { payload: ProcessingPayload; onBack: () => void }) {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>(BASE);
  const [erro, setErro] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const started = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const run = useCallback(async () => {
    setErro(null);
    setReportId(null);
    setSteps(BASE.map(s => s.id === 'transcricao'
      ? { ...s, status: payload.falas > 0 ? 'ok' : 'erro', detalhe: `${payload.falas} falas registradas` }
      : s.id === 'analise' ? { ...s, status: 'andamento' } : s));
    try {
      const res = await fetch('/api/analise', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.modo === 'demo' ? { modo: 'demo', turnos: payload.turnos } : { modo: 'real', transcricao: payload.transcricao }),
      });
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.etapas)) {
        setSteps(prev => prev.map(s => {
          const e = data.etapas.find((x: Step) => x.id === s.id);
          return e ? { ...s, status: e.status, detalhe: e.detalhe } : s;
        }));
      }
      if (!res.ok || !data.id) {
        setSteps(prev => prev.map(s => (s.status === 'andamento' || s.status === 'aguardando') && s.id !== 'transcricao' ? { ...s, status: s.status === 'andamento' ? 'erro' : 'aguardando' } : s));
        throw new Error(data.erro ?? 'Não foi possível preparar o seu mapa agora.');
      }
      setReportId(data.id);
    } catch (e) {
      setErro((e as Error).message === 'Failed to fetch' ? 'Sem conexão com o servidor. Verifique a internet e tente de novo.' : (e as Error).message);
    }
  }, [payload]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    headingRef.current?.focus();
    void run();
  }, [run]);

  const done = steps.filter(s => s.status === 'ok' || s.status === 'demonstrativa').length;
  const progress = reportId ? 1 : done / steps.length;

  return (
    <main id="conteudo" className="min-h-dvh bg-paper">
      <div className="shell flex min-h-dvh flex-col py-6">
        <div className="flex items-center justify-between gap-3 border-b-2 border-ink pb-3">
          <p className="meta">Mapa de Talentos / Processamento</p>
          {payload.modo === 'demo' && <span className="tag tag-demo">Demonstração · dados sintéticos</span>}
        </div>

        <div className="grid-12 flex-1 content-center gap-y-10 py-10">
          <div className="col-span-4 md:col-span-8 lg:col-span-6">
            <h1 ref={headingRef} tabIndex={-1} className="display-xl outline-none">
              {erro ? 'Algo não saiu como esperado.' : reportId ? 'Seu mapa está pronto.' : 'Estamos organizando suas histórias.'}
            </h1>
            <ol className="mt-10 border-t-2 border-ink" aria-label="Etapas do processamento">
              {steps.map((s, i) => (
                <li key={s.id} className="grid grid-cols-[40px_1fr_auto] items-baseline gap-3 border-b border-ink py-3">
                  <span className="meta">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="font-display text-lg font-medium">{s.label}</span>
                    {s.detalhe && <span className="small block text-ink-soft">{s.detalhe}</span>}
                  </span>
                  <span className={`tag ${s.status === 'ok' ? 'tag-green' : s.status === 'erro' ? 'border-[var(--error-text)] text-[var(--error-text)]' : s.status === 'demonstrativa' ? 'tag-demo' : ''}`}>
                    {s.status === 'andamento' && <span className="dot blink" aria-hidden="true" />}
                    {STATUS_TXT[s.status]}
                  </span>
                </li>
              ))}
            </ol>
            <p className="sr-only" role="status" aria-live="polite">
              {erro ? `Falha: ${erro}` : reportId ? 'Processamento concluído. Seu mapa está pronto.' : `Etapas concluídas: ${done} de ${steps.length}.`}
            </p>

            {erro && (
              <div role="alert" className="mt-8 border-2 border-[var(--error-text)] bg-surface p-5">
                <p className="font-display text-lg font-bold text-[var(--error-text)]">Não conseguimos gerar o documento.</p>
                <p className="mt-2">{erro}</p>
                <p className="small mt-2 text-ink-soft">Nenhum relatório foi criado. Suas falas não foram enviadas a ninguém além do serviço de análise.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => void run()}>Tentar de novo</button>
                  <button type="button" className="btn btn-sm" onClick={onBack}>Voltar à entrevista</button>
                </div>
              </div>
            )}
            {reportId && (
              <div className="mt-8">
                <button type="button" className="btn btn-primary" onClick={() => router.push(`/relatorio/${encodeURIComponent(reportId)}`)}>
                  Abrir meu mapa
                </button>
              </div>
            )}
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-8">
            <div className="panel relative h-[280px] md:h-[420px]">
              <AsciiProcessing className="absolute inset-0" progress={progress} failed={!!erro} />
            </div>
            <p className="meta meta-soft mt-3">Transcrição → Análise → Validação → Documento</p>
          </div>
        </div>
      </div>
    </main>
  );
}
