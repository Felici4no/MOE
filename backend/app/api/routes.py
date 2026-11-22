from typing import Annotated

from fastapi import APIRouter, Header, Request, Response

from app.domain.plans import PLANS
from app.domain.taxonomy import DOMAINS, THEMES
from app.schemas import (CandidateCreate, CandidateOut, CheckoutOut, CompanySignup, CultureInput, CultureOut, EvidenceInput,
                         FileInput, ImportOut, InterviewCreate, InterviewOut, InterviewState, InviteAccept, InviteCreate,
                         InviteOut, InvitePreview, JobInput, JobOut, JobSuggestInput, JobSuggestion, JoinOut, LeadInput,
                         Login, Me, OffScriptInput, PersonRow, PlanCheckout, PlanOut, RankingOut, ResultOut, SendInput,
                         SendOut, ShareInput, TenantAnalytics, TenantBilling, TranscriptLine)
from app.domain.hiring import CULTURE_VALUES, SOFT_SKILLS, WEIGHTS
from app.services.accounts import Accounts
from app.services.billing import Billing
from app.services.hiring import Hiring
from app.services.interviews import InterviewService
from app.services.tenants import TenantAdmin, preview_invite
from .deps import COOKIE, DbDep, SettingsDep, UserDep, end_session, start_session

api = APIRouter(prefix="/api/v1")
tools = APIRouter(prefix="/api/tools")


@api.get("/health")
def health(cfg: SettingsDep):
    return {"status": "ok", "interview_room": cfg.agora_ready, "avatar": False,
            "payments": "stripe-test" if cfg.stripe_ready else ("dev" if cfg.env != "prod" else "off"),
            "fit_ai": bool(cfg.analyst_api_key.get_secret_value()), "evidence_tools": bool(cfg.tools_url)}


@api.get("/taxonomy")
def taxonomy():
    return {"domains": [d.__dict__ for d in DOMAINS],
            "themes": [{k: v for k, v in t.__dict__.items() if k != "signals"} for t in THEMES]}


@api.get("/plans", response_model=list[PlanOut])
def plans(cfg: SettingsDep):
    return [PlanOut(**{**plan.__dict__, "features": list(plan.features)}) for plan in PLANS]


@api.get("/hiring/catalog")
def hiring_catalog():
    return {"soft_skills": [{"id": s.id, "name": s.name, "hint": s.hint} for s in SOFT_SKILLS],
            "culture_values": [{"id": c.id, "name": c.name, "hint": c.hint} for c in CULTURE_VALUES],
            "domains": [{"id": d.id, "name": d.name, "question": d.question} for d in DOMAINS],
            "weights": WEIGHTS}


@api.post("/leads", status_code=201)
def lead(data: LeadInput, request: Request, db: DbDep, cfg: SettingsDep):
    """Enterprise é sempre contato direto; o pedido fica registrado para o time comercial."""
    from app.api.deps import current_user
    user = None
    if request.cookies.get(COOKIE):
        try:
            user = current_user(request, db, cfg)
        except Exception:
            user = None
    Billing(db, cfg).lead(data, user)
    return {"received": True, "email": cfg.sales_email or None}


# --- Autenticação ---------------------------------------------------------------
@api.post("/auth/company/signup", response_model=Me, status_code=201)
def signup_company(data: CompanySignup, response: Response, db: DbDep, cfg: SettingsDep):
    accounts = Accounts(db, cfg)
    user = accounts.signup_company(data)
    start_session(response, cfg, user)
    return accounts.me(user)


@api.get("/auth/invites/{token}", response_model=InvitePreview)
def invite_preview(token: str, db: DbDep):
    return preview_invite(db, token)


@api.post("/auth/invites/accept", response_model=Me, status_code=201)
def accept_invite(data: InviteAccept, response: Response, db: DbDep, cfg: SettingsDep):
    accounts = Accounts(db, cfg)
    user = accounts.accept_invite(data)
    start_session(response, cfg, user)
    return accounts.me(user)


@api.post("/auth/login", response_model=Me)
def login(data: Login, response: Response, db: DbDep, cfg: SettingsDep):
    accounts = Accounts(db, cfg)
    user = accounts.login(data)
    start_session(response, cfg, user)
    return accounts.me(user)


@api.post("/auth/logout", status_code=204)
def logout(response: Response, cfg: SettingsDep):
    end_session(response, cfg)


@api.get("/me", response_model=Me)
def me(user: UserDep, db: DbDep, cfg: SettingsDep):
    return Accounts(db, cfg).me(user)


# --- Empresa: cultura, vagas e candidatos ----------------------------------------
@api.get("/tenant/culture", response_model=CultureOut)
def get_culture(user: UserDep, db: DbDep, cfg: SettingsDep):
    return Hiring(db, cfg, user).culture()


@api.put("/tenant/culture", response_model=CultureOut)
def put_culture(data: CultureInput, user: UserDep, db: DbDep, cfg: SettingsDep):
    return Hiring(db, cfg, user).save_culture(data)


@api.get("/tenant/jobs", response_model=list[JobOut])
def list_jobs(user: UserDep, db: DbDep, cfg: SettingsDep):
    return Hiring(db, cfg, user).jobs()


@api.post("/tenant/jobs", response_model=JobOut, status_code=201)
def create_job(data: JobInput, user: UserDep, db: DbDep, cfg: SettingsDep):
    return Hiring(db, cfg, user).create_job(data)


@api.post("/tenant/jobs/suggest", response_model=JobSuggestion)
def suggest_job(data: JobSuggestInput, user: UserDep, db: DbDep, cfg: SettingsDep):
    return Hiring(db, cfg, user).suggest(data)


@api.get("/tenant/jobs/{job_id}", response_model=RankingOut)
def job_ranking(job_id: str, user: UserDep, db: DbDep, cfg: SettingsDep):
    return Hiring(db, cfg, user).ranking(job_id)


@api.put("/tenant/jobs/{job_id}", response_model=JobOut)
def update_job(job_id: str, data: JobInput, user: UserDep, db: DbDep, cfg: SettingsDep):
    return Hiring(db, cfg, user).update_job(job_id, data)


@api.post("/tenant/jobs/{job_id}/import", response_model=ImportOut)
def import_candidates(job_id: str, data: FileInput, user: UserDep, db: DbDep, cfg: SettingsDep):
    return Hiring(db, cfg, user).import_candidates(job_id, data)


@api.post("/tenant/jobs/{job_id}/candidates", response_model=CandidateOut, status_code=201)
def add_candidate(job_id: str, data: CandidateCreate, user: UserDep, db: DbDep, cfg: SettingsDep):
    return Hiring(db, cfg, user).add_candidate(job_id, data)


@api.delete("/tenant/jobs/{job_id}/candidates/{candidate_id}", status_code=204)
def remove_candidate(job_id: str, candidate_id: str, user: UserDep, db: DbDep, cfg: SettingsDep):
    Hiring(db, cfg, user).remove_candidate(job_id, candidate_id)


@api.post("/tenant/jobs/{job_id}/send", response_model=SendOut)
def send_invites(job_id: str, user: UserDep, db: DbDep, cfg: SettingsDep, data: SendInput | None = None):
    return Hiring(db, cfg, user).send(job_id, data or SendInput())


@api.post("/tenant/jobs/{job_id}/reanalyze", response_model=RankingOut)
def reanalyze(job_id: str, user: UserDep, db: DbDep, cfg: SettingsDep):
    return Hiring(db, cfg, user).reanalyze(job_id)


# --- Empresa: cota, convites avulsos e análises ------------------------------------
@api.get("/tenant/people", response_model=list[PersonRow])
def people(user: UserDep, db: DbDep, cfg: SettingsDep):
    return TenantAdmin(db, cfg, user).people()


@api.get("/tenant/billing", response_model=TenantBilling)
def tenant_billing(user: UserDep, db: DbDep, cfg: SettingsDep):
    return TenantAdmin(db, cfg, user).billing()


@api.get("/tenant/invites", response_model=list[InviteOut])
def invites(user: UserDep, db: DbDep, cfg: SettingsDep):
    return TenantAdmin(db, cfg, user).invites()


@api.post("/tenant/invites", response_model=InviteOut, status_code=201)
def create_invite(data: InviteCreate, user: UserDep, db: DbDep, cfg: SettingsDep):
    return TenantAdmin(db, cfg, user).invite(data)


@api.post("/tenant/invites/{invite_id}/resend", response_model=InviteOut)
def resend_invite(invite_id: str, user: UserDep, db: DbDep, cfg: SettingsDep):
    return TenantAdmin(db, cfg, user).resend(invite_id)


@api.get("/tenant/analytics", response_model=TenantAnalytics)
def tenant_analytics(user: UserDep, db: DbDep, cfg: SettingsDep, days: int = 90):
    if days not in (0, 7, 30, 90, 365):
        days = 90
    return TenantAdmin(db, cfg, user).analytics(days)


@api.post("/tenant/invites/{invite_id}/revoke", response_model=InviteOut)
def revoke_invite(invite_id: str, user: UserDep, db: DbDep, cfg: SettingsDep):
    return TenantAdmin(db, cfg, user).revoke(invite_id)


# --- Assinatura da empresa ------------------------------------------------------
@api.post("/billing/subscribe", response_model=CheckoutOut)
def subscribe(data: PlanCheckout, user: UserDep, db: DbDep, cfg: SettingsDep):
    return Billing(db, cfg).checkout_plan(user, data.plan)


@api.post("/billing/portal", response_model=CheckoutOut)
def portal(user: UserDep, db: DbDep, cfg: SettingsDep):
    return Billing(db, cfg).portal(user)


@api.post("/billing/webhook", status_code=204)
async def webhook(request: Request, db: DbDep, cfg: SettingsDep,
                  stripe_signature: Annotated[str, Header()] = ""):
    Billing(db, cfg).webhook(await request.body(), stripe_signature)


# --- Entrevistas ---------------------------------------------------------------
def service(request: Request, db, cfg) -> InterviewService:
    return InterviewService(db, cfg, request.app.state.live)


@api.get("/interviews", response_model=list[InterviewOut])
def list_interviews(request: Request, user: UserDep, db: DbDep, cfg: SettingsDep):
    return service(request, db, cfg).mine(user)


@api.post("/interviews", response_model=InterviewOut, status_code=201)
def create_interview(request: Request, user: UserDep, db: DbDep, cfg: SettingsDep, data: InterviewCreate | None = None):
    return service(request, db, cfg).create(user, data.kind if data else None)


@api.post("/interviews/{interview_id}/restart", response_model=InterviewOut)
async def restart_interview(interview_id: str, request: Request, user: UserDep, db: DbDep, cfg: SettingsDep):
    return await service(request, db, cfg).restart(user, interview_id)


@api.post("/interviews/{interview_id}/prepare", response_model=JoinOut)
async def prepare(interview_id: str, request: Request, user: UserDep, db: DbDep, cfg: SettingsDep):
    return await service(request, db, cfg).prepare(user, interview_id)


@api.post("/interviews/{interview_id}/join", response_model=JoinOut)
async def join(interview_id: str, request: Request, user: UserDep, db: DbDep, cfg: SettingsDep,
               channel: str | None = None):
    return await service(request, db, cfg).join(user, interview_id, channel)


@api.get("/interviews/{interview_id}/state", response_model=InterviewState)
def state(interview_id: str, request: Request, user: UserDep, db: DbDep, cfg: SettingsDep):
    return service(request, db, cfg).state(user, interview_id)


@api.post("/interviews/{interview_id}/transcript", response_model=InterviewState)
async def transcript(interview_id: str, lines: list[TranscriptLine], request: Request, user: UserDep, db: DbDep,
                     cfg: SettingsDep, channel: str | None = None):
    """Também serve de sinal de vida: o navegador envia a cada 4 s, mesmo vazio."""
    return await service(request, db, cfg).transcript(user, interview_id, lines[:50], channel)


@api.post("/interviews/{interview_id}/leave", response_model=InterviewState)
async def leave(interview_id: str, request: Request, user: UserDep, db: DbDep, cfg: SettingsDep,
                channel: str | None = None):
    return await service(request, db, cfg).leave(user, interview_id, channel)


@api.get("/interviews/{interview_id}/evidence")
def live_evidence(interview_id: str, request: Request, user: UserDep, db: DbDep, cfg: SettingsDep):
    return service(request, db, cfg).live_evidence(user, interview_id)


@api.post("/interviews/{interview_id}/finish", response_model=ResultOut)
async def finish(interview_id: str, request: Request, user: UserDep, db: DbDep, cfg: SettingsDep):
    return await service(request, db, cfg).finish(user, interview_id)


@api.get("/interviews/{interview_id}/result", response_model=ResultOut)
def result(interview_id: str, request: Request, user: UserDep, db: DbDep, cfg: SettingsDep):
    return service(request, db, cfg).result(user, interview_id)


@api.post("/interviews/{interview_id}/share", response_model=InterviewOut)
def share(interview_id: str, data: ShareInput, request: Request, user: UserDep, db: DbDep, cfg: SettingsDep):
    return service(request, db, cfg).share(user, interview_id, data.share_with_tenant)


# --- Ferramenta chamada pela Agora --------------------------------------------
@tools.post("/interviews/{interview_id}/evidence")
def evidence(interview_id: str, data: EvidenceInput, request: Request, db: DbDep, cfg: SettingsDep,
             authorization: Annotated[str, Header()] = ""):
    return service(request, db, cfg).record_evidence(interview_id, authorization, data)


@tools.post("/interviews/{interview_id}/off-script")
async def off_script(interview_id: str, data: OffScriptInput, request: Request, db: DbDep, cfg: SettingsDep,
                     authorization: Annotated[str, Header()] = ""):
    return await service(request, db, cfg).report_off_script(interview_id, authorization, data)
