"""Contratos de entrada e saída da API (Pydantic)."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)


class Input(Schema):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


Password = Field(min_length=10, max_length=128)


class IndividualSignup(Input):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Password

    @field_validator("email")
    @classmethod
    def lower(cls, value: str) -> str:
        return value.lower()


class CompanySignup(IndividualSignup):
    company: str = Field(min_length=2, max_length=160)


class InviteAccept(Input):
    token: str = Field(min_length=20, max_length=128)
    name: str = Field(min_length=2, max_length=160)
    password: str = Password


class Login(Input):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    portal: Literal["empresa", "individual"]

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
    individual_checkout_available: bool
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
