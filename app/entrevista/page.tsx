import type { Metadata } from 'next';
import { getPublicStatus } from '@/lib/config';
import { InterviewExperience } from '@/components/entrevista/InterviewExperience';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Entrevista com a Lia', robots: { index: false } };

export default async function EntrevistaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const status = getPublicStatus();
  // ?ritmo=rapido acelera só a demonstração (usado nos testes E2E e em apresentações).
  const speed = !status.vozReal && sp.ritmo === 'rapido' ? 25 : 1;
  return <InterviewExperience vozReal={status.vozReal} speed={speed} />;
}
