"""Contratos de entrada e saída da API (Pydantic)."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)


class Input(Schema):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


Password = Field(min_length=10, max_length=128)


class CompanySignup(Input):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Password
    company: str = Field(min_length=2, max_length=160)

    @field_validator("email")
    @classmethod
    def lower(cls, value: str) -> str:
        return value.lower()


class InviteAccept(Input):
    token: str = Field(min_length=20, max_length=128)
    name: str = Field(default="", max_length=160)
    password: str = Field(min_length=1, max_length=128)
    # Vagas: a pessoa autoriza a empresa a ver a análise de fit e os trechos citados.
    consent: bool = False


class Login(Input):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def lower(cls, value: str) -> str:
        return value.lower()


class TenantOut(Schema):
    id: str
    name: str
    slug: str
    role: str


class TestInfo(Schema):
    id: str
    name: str
    minutes: str
    description: str
    available: int = 0


class Me(Schema):
    id: str
    name: str
    email: str
    kind: str
    tenant: TenantOut | None
    credits: int
    tests: list[TestInfo] = []
    stripe_enabled: bool
    free_interview_testing: bool = False
    can_restart_interviews: bool = False


class InviteCreate(Input):
    email: EmailStr
    name: str = Field(default="", max_length=160)
    tests: list[Literal["completa", "rapida"]] = Field(default_factory=lambda: ["completa"], min_length=1, max_length=2)

    @field_validator("email")
    @classmethod
    def lower(cls, value: str) -> str:
        return value.lower()


class InviteOut(Schema):
    id: str
    email: str
    name: str
    status: str
    created_at: datetime
    status_at: datetime
    expires_at: datetime
    tests: list[str] = ["completa"]
    link: str | None = None

    @field_validator("tests", mode="before")
    @classmethod
    def default_tests(cls, value):  # convites antigos não tinham a coluna
        return value or ["completa"]
    emailed: bool | None = None


class InvitePreview(Schema):
    company: str
    email: str
    name: str
    tests: list[TestInfo]
    job: str | None = None
    has_account: bool = False
    assessment: str = "entrevista"


class CheckoutOut(Schema):
    url: str
    mode: Literal["stripe", "dev"]


class InterviewOut(Schema):
    id: str
    kind: str = "completa"
    status: str

    @field_validator("kind", mode="before")
    @classmethod
    def default_kind(cls, value):
        return value or "completa"
    share_with_tenant: bool
    job_id: str | None = None
    job_title: str | None = None
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime


class InterviewCreate(Input):
    kind: Literal["completa", "rapida"] | None = None


class JoinOut(Schema):
    interview_id: str
    app_id: str
    channel: str
    uid: int
    token: str
    agent_uid: int
    avatar_uid: None = None
    avatar: Literal[False] = False


class TranscriptLine(Input):
    speaker: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=4000)


class ShareInput(Input):
    share_with_tenant: bool


class EvidenceInput(Input):
    theme_id: str = Field(max_length=60)
    quote: str = Field(min_length=8, max_length=600)
    reason: str = Field(default="", max_length=400)


class OffScriptInput(Input):
    quote: str = Field(min_length=3, max_length=600)
    reason: str = Field(default="", max_length=400)


class ThemeScore(Schema):
    id: str
    name: str
    domain: str
    confidence: Literal["Forte", "Moderado"]
    evidence: list[str]
    summary: str
    at_work: str = ""


class PathScore(Schema):
    name: str
    evidence: str


class Discovering(Schema):
    id: str
    name: str
    domain: str
    invite: str


class ResultOut(Schema):
    interview_id: str
    method: str
    themes: list[ThemeScore]
    paths: list[PathScore]
    discovering: Discovering | None
    wellbeing_alert: bool
    summary: str
    notice: str
    created_at: datetime


class PersonRow(Schema):
    user_id: str
    name: str
    email: str
    role: str
    interview_status: str | None
    shared: bool
    top_themes: list[str]


class TenantBilling(Schema):
    plan: str
    plan_name: str
    status: str
    period_end: datetime | None
    used: int
    limit: int | None
    trial: bool
    portal: bool


class PlanOut(Schema):
    id: str
    name: str
    audience: str
    billing: str
    price_cents: int | None
    interviews: int | None
    pitch: str
    features: list[str]
    available: bool = True
    free_testing: bool = False


class PlanCheckout(Input):
    plan: Literal["equipe", "empresa"]


# --- Cultura, vagas e candidatos ------------------------------------------------
class FileInput(Input):
    """Arquivo enviado pelo navegador em base64 (evita multipart)."""
    filename: str = Field(min_length=1, max_length=200)
    content_base64: str = Field(min_length=4, max_length=8_000_000)


class CultureValue(Schema):
    id: str = Field(default="", max_length=60)
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=300)


class CultureInput(Input):
    text: str = Field(default="", max_length=40_000)
    values: list[CultureValue] | None = Field(default=None, max_length=12)
    file: FileInput | None = None


class CultureOut(Schema):
    text: str
    source_name: str
    values: list[CultureValue]
    method: str
    updated_at: datetime | None


class JobSkill(Schema):
    id: str = Field(default="", max_length=60)
    name: str = Field(min_length=2, max_length=80)
    level: Literal["essencial", "desejavel"] = "essencial"


class JobProfile(Schema):
    fazer: int = Field(default=50, ge=0, le=100)
    gente: int = Field(default=50, ge=0, le=100)
    pensar: int = Field(default=50, ge=0, le=100)
    forca: int = Field(default=50, ge=0, le=100)


class JobInput(Input):
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=20_000)
    soft_skills: list[JobSkill] = Field(default_factory=list, max_length=12)
    hard_skills: list[JobSkill] = Field(default_factory=list, max_length=12)
    assessment: Literal["entrevista", "simulacao"] = "entrevista"
    scenario_id: str | None = Field(default=None, max_length=32)
    profile: JobProfile = Field(default_factory=JobProfile)
    profile_note: str = Field(default="", max_length=2000)
    test: Literal["completa", "rapida"] = "completa"
    status: Literal["open", "closed"] = "open"


class JobSuggestInput(Input):
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=20_000)


class JobSuggestion(Schema):
    soft_skills: list[JobSkill]
    hard_skills: list[JobSkill] = []
    profile: JobProfile
    profile_note: str
    method: str


class Funnel4(Schema):
    imported: int
    invited: int
    started: int
    analyzed: int


class JobOut(Schema):
    id: str
    title: str
    description: str
    soft_skills: list[JobSkill]
    hard_skills: list[JobSkill] = []
    assessment: str = "entrevista"
    scenario_id: str | None = None
    scenario_title: str | None = None
    profile: JobProfile
    profile_note: str
    test: str
    status: str
    created_at: datetime
    funnel: Funnel4
    top_fit: int | None = None


class Evidence(Schema):
    label: str
    score: int
    quote: str | None = None


class Differential(Schema):
    title: str
    quote: str


class Reflect(Schema):
    axis: str
    label: str


class Reflection(Schema):
    persona: str
    role: str
    stage: str = ""
    npc_line: str
    quote: str
    reflects: list[Reflect]
    note: str


class FitOut(Schema):
    overall: int
    culture: int
    profile: int
    soft_skills: int
    hard_skills: int | None = None
    culture_detail: list[Evidence]
    skills_detail: list[Evidence]
    hard_detail: list[Evidence] = []
    profile_detail: dict[str, int]
    differentials: list[Differential]
    summary: str
    method: str
    reflections: list[Reflection] = []


class CandidateOut(Schema):
    id: str
    name: str
    email: str
    stage: Literal["imported", "invited", "accepted", "interviewing", "analyzed", "expired", "private"]
    invited_at: datetime | None = None
    analyzed_at: datetime | None = None
    fit: FitOut | None = None


class CandidateCreate(Input):
    email: EmailStr
    name: str = Field(default="", max_length=160)

    @field_validator("email")
    @classmethod
    def lower(cls, value: str) -> str:
        return value.lower()


class ImportRejected(Schema):
    row: int
    value: str
    reason: str


class ImportOut(Schema):
    added: int
    duplicates: int
    rejected: list[ImportRejected]


class SendInput(Input):
    candidate_ids: list[str] | None = Field(default=None, max_length=2000)


class SendOut(Schema):
    sent: int
    emailed: int
    skipped: int
    links: list[dict] = []
    message: str = ""


class Bucket(Schema):
    start: int
    end: int
    count: int


class RankingOut(Schema):
    job: JobOut
    candidates: list[CandidateOut]
    distribution: list[Bucket]
    median: int | None
    weights: dict[str, float]


class LeadInput(Input):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    company: str = Field(min_length=2, max_length=160)
    people: int = Field(default=0, ge=0, le=1000000)
    message: str = Field(default="", max_length=2000)


class Attempt(Schema):
    n: int
    started_at: datetime
    ended_at: datetime | None = None
    end_reason: str | None = None


class Violation(Schema):
    at: datetime
    attempt: int
    kind: str
    label: str
    source: str


class InterviewState(Schema):
    id: str
    kind: str = "completa"
    status: str
    attempts: list[Attempt]
    max_attempts: int
    violations: list[Violation]
    max_strikes: int
    live: bool


class Funnel(Schema):
    invited: int
    accepted: int
    started: int
    completed: int
    cancelled: int


class Count(Schema):
    label: str
    value: int
    key: str = ""


class Week(Schema):
    week: str
    invited: int
    completed: int


class TenantAnalytics(Schema):
    days: int
    funnel: Funnel
    completion_rate: float | None
    avg_minutes: float | None
    attempts: list[Count]
    end_reasons: list[Count]
    violations_total: int
    interviews_with_violations: int
    violations_by_kind: list[Count]
    shared_profiles: int
    talents: list[Count]
    domains: list[Count]
    paths: list[Count]
    weekly: list[Week]
