from typing import Annotated

from fastapi import APIRouter, Header, Request, Response

from app.domain.plans import PLANS
from app.domain.taxonomy import DOMAINS, THEMES
from app.schemas import (CheckoutOut, CompanySignup, InterviewCreate, EvidenceInput, IndividualSignup, InterviewOut, InterviewState,
                         InviteAccept, InviteCreate, InviteOut, InvitePreview, JoinOut, LeadInput, Login, Me,
                         OffScriptInput, PersonRow, PlanCheckout, PlanOut, ResultOut, ShareInput, TenantAnalytics, TenantBilling,
                         TranscriptLine)
from app.services.accounts import Accounts
from app.services.billing import Billing
from app.services.interviews import InterviewService
from app.services.tenants import TenantAdmin, preview_invite
from .deps import COOKIE, DbDep, SettingsDep, UserDep, end_session, start_session

api = APIRouter(prefix="/api/v1")
tools = APIRouter(prefix="/api/tools")


@api.get("/health")
def health(cfg: SettingsDep):
    return {"status": "ok", "interview_room": cfg.agora_ready, "avatar": False,
            "payments": "stripe-test" if cfg.stripe_ready else ("dev" if cfg.env != "prod" else "off"),
            "individual_checkout_available": cfg.individual_checkout_available,
            "evidence_tools": bool(cfg.tools_url)}


@api.get("/taxonomy")
def taxonomy():
    return {"domains": [d.__dict__ for d in DOMAINS],
            "themes": [{k: v for k, v in t.__dict__.items() if k != "signals"} for t in THEMES]}


@api.get("/plans", response_model=list[PlanOut])
def plans(cfg: SettingsDep):
    catalog = []
    for plan in PLANS:
        individual = plan.id == "individual"
        free_testing = individual and not cfg.interview_payments_enabled
        features = ["Mapa de Talentos e Mapa rápido", "Perfil com evidências nas suas palavras"] \
            if free_testing else list(plan.features)
        catalog.append(PlanOut(**{**plan.__dict__, "features": features},
                               available=not individual or cfg.individual_checkout_available, free_testing=free_testing))
    return catalog


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


# --- Autenticação: dois portais -------------------------------------------------
@api.post("/auth/individual/signup", response_model=Me, status_code=201)
def signup_individual(data: IndividualSignup, response: Response, db: DbDep, cfg: SettingsDep):
    accounts = Accounts(db, cfg)
    user = accounts.signup_individual(data)
    start_session(response, cfg, user)
    return accounts.me(user)


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


# --- Locatário (B2B) -----------------------------------------------------------
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


# --- Aquisição individual (B2C) ------------------------------------------------
@api.post("/billing/checkout", response_model=CheckoutOut)
def checkout(user: UserDep, db: DbDep, cfg: SettingsDep):
    return Billing(db, cfg).checkout_individual(user)


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
