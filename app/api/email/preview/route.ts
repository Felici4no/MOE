import { getReport } from '@/lib/reports';
import { renderReportEmail } from '@/lib/email/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Prévia visual do e-mail. Não envia nada. Restrita a documentos de demonstração. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!id.startsWith('demo-')) {
    return Response.json({ erro: 'A prévia está disponível apenas para documentos de demonstração.' }, { status: 403 });
  }
  const doc = await getReport(id);
  if (!doc || !doc.relatorio) return Response.json({ erro: 'Documento não encontrado.' }, { status: 404 });
  const html = await renderReportEmail(doc, `${new URL(req.url).origin}/relatorio/${encodeURIComponent(doc.id)}`, true);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
