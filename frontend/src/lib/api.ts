export type Tenant = { id: string; name: string; slug: string; role: "owner" | "admin" | "participant" };
export type TestInfo = { id: "completa" | "rapida"; name: string; minutes: string; description: string; available: number };
export type Me = { id: string; name: string; email: string; kind: "individual" | "member"; tenant: Tenant | null; credits: number; tests: TestInfo[]; stripe_enabled: boolean; free_interview_testing: boolean; can_restart_interviews: boolean };
export type Interview = { id: string; kind: "completa" | "rapida"; status: "ready" | "live" | "finished" | "analyzed" | "cancelled" | "restarted" | "failed"; share_with_tenant: boolean; job_id: string | null; job_title: string | null; started_at: string | null; ended_at: string | null; created_at: string };
export type ThemeScore = { id: string; name: string; domain: DomainId; confidence: "Forte" | "Moderado"; evidence: string[]; summary: string; at_work: string };
export type PathScore = { name: string; evidence: string };
export type Discovering = { id: string; name: string; domain: DomainId; invite: string };
export type Result = { interview_id: string; method: "analyst" | "agent" | "lexical"; themes: ThemeScore[]; paths: PathScore[]; discovering: Discovering | null; wellbeing_alert: boolean; summary: string; notice: string; created_at: string };
export type Attempt = { n: number; started_at: string; ended_at: string | null; end_reason: "completed" | "dropped" | "left" | "guardrail" | "silence" | "restart" | null };
export type Violation = { at: string; attempt: number; kind: string; label: string; source: "server" | "agent" };
export type InterviewState = { id: string; kind: "completa" | "rapida"; status: Interview["status"]; attempts: Attempt[]; max_attempts: number; violations: Violation[]; max_strikes: number; live: boolean };
export type Plan = { id: "equipe" | "empresa" | "enterprise"; name: string; audience: "empresa"; billing: "monthly" | "contact"; price_cents: number | null; interviews: number | null; pitch: string; features: string[]; available: boolean; free_testing: boolean };
export type Count = { label: string; value: number; key: string };
export type TenantAnalytics = { days: number; funnel: { invited: number; accepted: number; started: number; completed: number; cancelled: number }; completion_rate: number | null; avg_minutes: number | null; attempts: Count[]; end_reasons: Count[]; violations_total: number; interviews_with_violations: number; violations_by_kind: Count[]; shared_profiles: number; talents: Count[]; domains: Count[]; paths: Count[]; weekly: { week: string; invited: number; completed: number }[] };
export type TenantBilling = { plan: string; plan_name: string; status: string; period_end: string | null; used: number; limit: number | null; trial: boolean; portal: boolean };
export type Invite = { id: string; email: string; name: string; status: "sent" | "used" | "revoked" | "expired"; created_at: string; status_at: string; expires_at: string; tests: string[]; link: string | null; emailed?: boolean | null };
export type Person = { user_id: string; name: string; email: string; role: string; interview_status: Interview["status"] | null; shared: boolean; top_themes: string[] };
export type Join = { interview_id: string; app_id: string; channel: string; uid: number; token: string; agent_uid: number };
export type DomainId = "fazer" | "gente" | "pensar" | "forca";
export type CheckoutUrl = { url: string; mode: "stripe" | "dev" };
export type LiveEvidence = { theme_id: string; theme: string; domain: DomainId; quote: string };
export type Health = { status: string; interview_room: boolean; avatar: boolean; payments: "stripe-test" | "dev" | "off"; fit_ai: boolean; evidence_tools: boolean };

// --- Contratação por fit ---------------------------------------------------------
export type CultureValue = { id: string; name: string; description: string };
export type Culture = { text: string; source_name: string; values: CultureValue[]; method: "" | "ai" | "catalog" | "manual"; updated_at: string | null };
export type JobSkill = { id: string; name: string; level: "essencial" | "desejavel" };
export type JobProfile = Record<DomainId, number>;
export type Job = { id: string; title: string; description: string; soft_skills: JobSkill[]; hard_skills: JobSkill[]; assessment: "entrevista" | "simulacao"; scenario_id: string | null; scenario_title: string | null; profile: JobProfile; profile_note: string; test: "completa" | "rapida"; status: "open" | "closed"; created_at: string; funnel: { imported: number; invited: number; started: number; analyzed: number }; top_fit: number | null };
export type JobInput = Omit<Job, "id" | "created_at" | "funnel" | "top_fit" | "scenario_title">;
export type Evidence = { label: string; score: number; quote: string | null };
export type Axis = "culture" | "profile" | "soft_skills" | "hard_skills";
export type Reflection = { persona: string; role: string; stage: string; npc_line: string; quote: string; reflects: { axis: Axis; label: string }[]; note: string };
export type Fit = { overall: number; culture: number; profile: number; soft_skills: number; hard_skills: number | null; culture_detail: Evidence[]; skills_detail: Evidence[]; hard_detail: Evidence[]; profile_detail: JobProfile; differentials: { title: string; quote: string }[]; summary: string; method: "ai" | "lexical"; reflections: Reflection[] };
export type Stage = "imported" | "invited" | "accepted" | "interviewing" | "analyzed" | "expired" | "private";
export type Candidate = { id: string; name: string; email: string; stage: Stage; invited_at: string | null; analyzed_at: string | null; fit: Fit | null };
export type Ranking = { job: Job; candidates: Candidate[]; distribution: { start: number; end: number; count: number }[]; median: number | null; weights: Record<Axis, number> };
export type Catalog = { soft_skills: { id: string; name: string; hint: string }[]; hard_skills: { id: string; name: string; hint: string }[]; culture_values: { id: string; name: string; hint: string }[]; domains: { id: DomainId; name: string; question: string }[]; weights: Ranking["weights"] };
export type ImportResult = { added: number; duplicates: number; rejected: { row: number; value: string; reason: string }[] };
export type SendResult = { sent: number; emailed: number; skipped: number; links: { email: string; name: string; link: string }[]; message: string };

/** Lê um arquivo do navegador como base64 para enviar em JSON. */
export function fileToPayload(file: File): Promise<{ filename: string; content_base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ filename: file.name, content_base64: String(reader.result).split(",", 2)[1] ?? "" });
    reader.onerror = () => reject(new Error("Não conseguimos ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: init.body === undefined ? undefined : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
      cache: "no-store",
      signal: init.signal,
    });
  } catch {
    throw new ApiError(0, "Sem conexão com o servidor. Confira sua internet e tente de novo.");
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, typeof data.detail === "string" ? data.detail : "Algo deu errado. Tente de novo.");
  return data as T;
}

export const DOMAINS: Record<DomainId, { name: string; question: string }> = {
  fazer: { name: "Fazer Acontecer", question: "Como você entrega resultado" },
  gente: { name: "Lidar com Gente", question: "Como você se relaciona" },
  pensar: { name: "Pensar e Criar", question: "Como você resolve e aprende" },
  forca: { name: "Força Interior", question: "Como você se sustenta" },
};

export const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
