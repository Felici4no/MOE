import 'server-only';

/**
 * Estado das integrações, lido APENAS no servidor. Nunca exponha valores; o cliente
 * recebe somente booleanos via /api/status.
 */
const has = (v: string | undefined) => typeof v === 'string' && v.trim().length > 0;

export function getConfig() {
  const e = process.env;
  const storePersistente = has(e.UPSTASH_REDIS_REST_URL ?? e.KV_REST_API_URL) && has(e.UPSTASH_REDIS_REST_TOKEN ?? e.KV_REST_API_TOKEN);
  const emLocal = e.NODE_ENV !== 'production';
  // Em produção serverless, memória não é compartilhada entre instâncias: exigimos store persistente.
  const storeDisponivel = storePersistente || emLocal;
  return {
    projectName: e.NEXT_PUBLIC_PROJECT_NAME?.trim() || 'Mapa de Talentos',
    clientName: e.REPORT_CLIENT_NAME?.trim() || null,
    appBaseUrl: e.APP_BASE_URL?.trim() || null,
    reportTtlDays: Math.max(1, Math.min(365, Number(e.REPORT_TTL_DAYS) || 30)),
    storePersistente,
    voz: {
      agoraConfigurado: has(e.AGORA_APP_ID) && has(e.AGORA_APP_CERTIFICATE) && has(e.AGORA_CUSTOMER_ID) && has(e.AGORA_CUSTOMER_SECRET),
      // O adaptador Agora ainda não está ligado (ver lib/voice/agora.ts).
      agoraImplementado: false,
    },
    analista: {
      configurado: has(e.ANALYST_LLM_API_KEY),
      baseUrl: e.ANALYST_LLM_BASE_URL?.trim() || 'https://api.openai.com/v1',
      modelo: e.ANALYST_LLM_MODEL?.trim() || 'gpt-4o-mini',
    },
    email: {
      disponivel: has(e.RESEND_API_KEY) && has(e.EMAIL_FROM) && has(e.EMAIL_HASH_SECRET) && storeDisponivel,
      from: e.EMAIL_FROM?.trim() || '',
    },
    storeDisponivel,
  };
}

export type PublicStatus = {
  vozReal: boolean;
  analistaReal: boolean;
  emailReal: boolean;
  armazenamentoPersistente: boolean;
};

export function getPublicStatus(): PublicStatus {
  const c = getConfig();
  return {
    vozReal: c.voz.agoraConfigurado && c.voz.agoraImplementado,
    analistaReal: c.analista.configurado && c.storeDisponivel,
    emailReal: c.email.disponivel,
    armazenamentoPersistente: c.storePersistente,
  };
}
