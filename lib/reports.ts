import 'server-only';
import { getKV } from '@/lib/store';
import { getDemoReport, isDemoId } from '@/lib/demo/fixtures';
import type { ReportDocument } from '@/lib/domain/report';
import { REAL_ID_RE } from '@/lib/security';

const key = (id: string) => `relatorio:${id}`;

export async function getReport(id: string): Promise<ReportDocument | null> {
  if (isDemoId(id)) return getDemoReport(id);
  if (!REAL_ID_RE.test(id)) return null;
  return getKV().get<ReportDocument>(key(id));
}

export async function saveReport(doc: ReportDocument, ttlDays: number) {
  if (doc.kind !== 'real') throw new Error('Documentos demo não são armazenados');
  await getKV().set(key(doc.id), doc, ttlDays * 86400);
}
