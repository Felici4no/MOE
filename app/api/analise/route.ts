import { z } from 'zod';
import { getConfig } from '@/lib/config';
import { getDemoReport, DEMO_TURNOS } from '@/lib/demo/fixtures';
import { buildReportDocument } from '@/lib/domain/report';
import { OpenAICompatibleAnalyst, AnalystError } from '@/lib/analyst';
import { saveReport } from '@/lib/reports';
import { newReportId, rateLimit, clientIp } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.discriminatedUnion('modo', [
  z.object({ modo: z.literal('demo'), turnos: z.number().int().min(0).max(DEMO_TURNOS.length) }),
  z.object({ modo: z.literal('real'), transcricao: z.string().min(1).max(60_000) }),
]);

type Etapa = { id: string; status: 'ok' | 'demonstrativa' | 'erro' | 'aguardando'; detalhe?: string };

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: 'Requisição inválida.' }, { status: 400 });
  const body = parsed.data;

  /* ----------------------------- DEMONSTRAÇÃO ----------------------------- */
  if (body.modo === 'demo') {
    if (body.turnos === 0) {
      return Response.json({ erro: 'A conversa terminou antes de começar. Não há falas para analisar.' }, { status: 422 });
    }
    const id = `demo-sessao-${body.turnos}`;
    const doc = getDemoReport(id);
    if (!doc) return Response.json({ erro: 'Sessão de demonstração inválida.' }, { status: 400 });
    const t = doc.relatorio?.talentos.length ?? 0;
    const etapas: Etapa[] = [
      { id: 'analise', status: 'demonstrativa', detalhe: 'Resposta sintética do analista; nenhum modelo foi chamado' },
      { id: 'validacao', status: 'ok', detalhe: `Validador real: ${t} ${t === 1 ? 'talento mantido' : 'talentos mantidos'}, ${doc.descartes} ${doc.descartes === 1 ? 'item descartado' : 'itens descartados'}` },
      { id: 'documento', status: 'ok', detalhe: 'Documento de demonstração (não armazenado)' },
    ];
    return Response.json({ id, etapas });
  }

  /* -------------------------------- REAL ---------------------------------- */
  const cfg = getConfig();
  if (!cfg.analista.configurado || !cfg.storeDisponivel) {
    return Response.json({
      erro: 'A análise real não está configurada neste ambiente.',
      etapas: [{ id: 'analise', status: 'erro', detalhe: 'Serviço de análise indisponível' }],
    }, { status: 503 });
  }
  if (!(await rateLimit(`analise:${clientIp(req)}`, 5, 3600))) {
    return Response.json({ erro: 'Muitas análises seguidas. Tente novamente mais tarde.' }, { status: 429 });
  }

  const analyst = new OpenAICompatibleAnalyst({
    apiKey: process.env.ANALYST_LLM_API_KEY!, baseUrl: cfg.analista.baseUrl, model: cfg.analista.modelo,
  });
  let analise: unknown;
  try {
    analise = await analyst.analisar(body.transcricao);
  } catch (e) {
    const etapa = e instanceof AnalystError ? e.etapa : 'provedor';
    console.error('[analise] falha', { etapa }); // sem conteúdo da transcrição
    return Response.json({
      erro: 'O serviço de análise não respondeu como esperado. Nenhum relatório foi criado.',
      etapas: [{ id: 'analise', status: 'erro', detalhe: 'Falha no serviço de análise' }],
    }, { status: 502 });
  }

  const doc = buildReportDocument({
    id: newReportId(), kind: 'real', analise, transcricao: body.transcricao,
    projectName: cfg.projectName, clientName: cfg.clientName, createdAt: new Date().toISOString(),
  });
  const t = doc.relatorio?.talentos.length ?? 0;
  try {
    await saveReport(doc, cfg.reportTtlDays);
  } catch {
    console.error('[analise] falha ao salvar documento');
    return Response.json({
      erro: 'Não foi possível salvar o documento.',
      etapas: [
        { id: 'analise', status: 'ok' },
        { id: 'validacao', status: 'ok' },
        { id: 'documento', status: 'erro', detalhe: 'Falha ao salvar' },
      ],
    }, { status: 500 });
  }
  return Response.json({
    id: doc.id,
    etapas: [
      { id: 'analise', status: 'ok', detalhe: `Modelo: ${cfg.analista.modelo}` },
      { id: 'validacao', status: 'ok', detalhe: doc.status === 'apoio' ? 'Conteúdo protegido' : `${t} ${t === 1 ? 'talento mantido' : 'talentos mantidos'}, ${doc.descartes} descartados` },
      { id: 'documento', status: 'ok', detalhe: `Privado, expira em ${cfg.reportTtlDays} dias` },
    ],
  });
}
