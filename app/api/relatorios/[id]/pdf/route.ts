import { getReport } from '@/lib/reports';
import { renderReportPdf, pdfFilename } from '@/lib/pdf/ReportPdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getReport(id);
  if (!doc) return Response.json({ erro: 'Relatório não encontrado.' }, { status: 404 });
  if (!doc.relatorio) return Response.json({ erro: 'Este documento não tem conteúdo exportável.' }, { status: 409 });
  try {
    const pdf = await renderReportPdf(doc);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFilename(doc)}"`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (e) {
    // Apenas o tipo do erro: nunca o conteúdo do relatório.
    console.error('[pdf] falha ao gerar documento', { kind: doc.kind, erro: (e as Error)?.name, msg: (e as Error)?.message?.slice(0, 200) });
    return Response.json({ erro: 'Não foi possível gerar o PDF agora.' }, { status: 500 });
  }
}
