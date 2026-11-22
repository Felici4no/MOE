import { z } from 'zod';
import { solicitarCodigo } from '@/lib/email/service';
import { clientIp } from '@/lib/security';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  reportId: z.string().min(3).max(64),
  email: z.email().max(254),
  // Confirmação explícita de entrega. NÃO é autorização de compartilhamento com empresa.
  consentimento: z.literal(true),
});

export async function POST(req: Request) {
  if (!getConfig().email.disponivel) {
    return Response.json({ erro: 'O envio por e-mail não está disponível neste ambiente.' }, { status: 503 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: 'Confira o endereço de e-mail e a confirmação.' }, { status: 400 });
  const res = await solicitarCodigo({ ...parsed.data, ip: clientIp(req) });
  return Response.json(res.body, { status: res.status });
}
