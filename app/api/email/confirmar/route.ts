import { z } from 'zod';
import { confirmarEnvio } from '@/lib/email/service';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  reportId: z.string().min(3).max(64),
  email: z.email().max(254),
  codigo: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  if (!getConfig().email.disponivel) {
    return Response.json({ erro: 'O envio por e-mail não está disponível neste ambiente.' }, { status: 503 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: 'Código ou endereço inválido.' }, { status: 400 });
  try {
    const res = await confirmarEnvio(parsed.data);
    return Response.json(res.body, { status: res.status });
  } catch {
    console.error('[email] falha inesperada na confirmação');
    return Response.json({ erro: 'Não foi possível concluir o envio agora.' }, { status: 500 });
  }
}
