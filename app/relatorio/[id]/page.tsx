import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getReport } from '@/lib/reports';
import { getConfig } from '@/lib/config';
import { ReportView, SupportView } from '@/components/relatorio/ReportView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Seu relatório',
  robots: { index: false, follow: false },
};

export default async function RelatorioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getReport(id);
  if (!doc) notFound();
  if (doc.status === 'apoio' || !doc.relatorio) return <SupportView doc={doc} />;
  const cfg = getConfig();
  const email = doc.kind === 'demo'
    ? { disponivel: false, motivo: 'Este é um documento de demonstração com dados sintéticos. Documentos de demonstração nunca são enviados por e-mail.' }
    : cfg.email.disponivel
      ? { disponivel: true, motivo: null }
      : { disponivel: false, motivo: 'O serviço de e-mail ainda não foi configurado neste ambiente. Você pode baixar o PDF agora.' };
  return <ReportView doc={doc} email={email} ttlDays={cfg.reportTtlDays} />;
}
