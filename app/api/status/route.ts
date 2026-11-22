import { getPublicStatus } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** Somente booleanos: quais integrações reais estão ativas. Nunca valores de configuração. */
export function GET() {
  return Response.json(getPublicStatus(), { headers: { 'Cache-Control': 'no-store' } });
}
