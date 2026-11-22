"""Tabelas. Toda linha de negócio pertence a uma pessoa ou a um locatário."""
import uuid
from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def uid() -> str:
    return uuid.uuid4().hex


def now() -> datetime:
    return datetime.now(UTC)


class AccountKind(StrEnum):
    individual = "individual"   # B2C: comprou a própria entrevista
    member = "member"           # B2B: pertence a um locatário


class Role(StrEnum):
    owner = "owner"
    admin = "admin"
    participant = "participant"


class InviteStatus(StrEnum):
    sent = "sent"
    used = "used"
    revoked = "revoked"
    expired = "expired"


class CreditStatus(StrEnum):
    available = "available"
    reserved = "reserved"
    used = "used"


class InterviewStatus(StrEnum):
    ready = "ready"
    live = "live"
    finished = "finished"
    analyzed = "analyzed"
    cancelled = "cancelled"   # 3ª advertência dos guardrails
    restarted = "restarted"
    failed = "failed"


class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    plan: Mapped[str] = mapped_column(String(20), default="")           # equipe | empresa | enterprise
    subscription_status: Mapped[str] = mapped_column(String(30), default="")
    stripe_customer_id: Mapped[str] = mapped_column(String(64), default="")
    stripe_subscription_id: Mapped[str] = mapped_column(String(64), default="")
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    memberships: Mapped[list["Membership"]] = relationship(back_populates="tenant")


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    password_hash: Mapped[str] = mapped_column(String(255))
    kind: Mapped[AccountKind] = mapped_column(Enum(AccountKind, native_enum=False))
    stripe_customer_id: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    memberships: Mapped[list["Membership"]] = relationship(back_populates="user")


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("tenant_id", "user_id"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[Role] = mapped_column(Enum(Role, native_enum=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    tenant: Mapped[Tenant] = relationship(back_populates="memberships")
    user: Mapped[User] = relationship(back_populates="memberships")


class Invite(Base):
    __tablename__ = "invites"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(254), index=True)
    name: Mapped[str] = mapped_column(String(160), default="")
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    tests: Mapped[list] = mapped_column(JSON, default=lambda: ["completa"])
    status: Mapped[InviteStatus] = mapped_column(Enum(InviteStatus, native_enum=False), default=InviteStatus.sent)
    invited_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    status_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Purchase(Base):
    __tablename__ = "purchases"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(20))  # stripe | dev
    provider_ref: Mapped[str] = mapped_column(String(255), unique=True)
    amount_cents: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | paid
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Credit(Base):
    """Uma entrevista. Origem: compra individual ou convite de locatário."""
    __tablename__ = "credits"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tenant_id: Mapped[str | None] = mapped_column(ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)
    source: Mapped[str] = mapped_column(String(20))  # purchase | invite | restart | trial
    source_ref: Mapped[str] = mapped_column(String(64), unique=True)
    kind: Mapped[str] = mapped_column(String(20), default="completa")
    status: Mapped[CreditStatus] = mapped_column(Enum(CreditStatus, native_enum=False), default=CreditStatus.available)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Interview(Base):
    __tablename__ = "interviews"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tenant_id: Mapped[str | None] = mapped_column(ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True, index=True)
    credit_id: Mapped[str] = mapped_column(ForeignKey("credits.id"), unique=True)
    kind: Mapped[str] = mapped_column(String(20), default="completa")
    avatar_used: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[InterviewStatus] = mapped_column(Enum(InterviewStatus, native_enum=False, length=20), default=InterviewStatus.ready)
    channel: Mapped[str] = mapped_column(String(64), default="")
    tool_secret_hash: Mapped[str] = mapped_column(String(64), default="")
    transcript: Mapped[list] = mapped_column(JSON, default=list)
    evidence: Mapped[list] = mapped_column(JSON, default=list)
    # [{n, started_at, ended_at, end_reason: completed|dropped|guardrail|left|silence|restart}]
    attempts: Mapped[list] = mapped_column(JSON, default=list)
    # [{at, attempt, kind, source: server|agent, quote}]
    violations: Mapped[list] = mapped_column(JSON, default=list)
    share_with_tenant: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Result(Base):
    __tablename__ = "results"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    interview_id: Mapped[str] = mapped_column(ForeignKey("interviews.id", ondelete="CASCADE"), unique=True)
    method: Mapped[str] = mapped_column(String(20))  # analyst | agent | lexical
    themes: Mapped[list] = mapped_column(JSON)
    paths: Mapped[list] = mapped_column(JSON, default=list)
    discovering: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    wellbeing_alert: Mapped[bool] = mapped_column(Boolean, default=False)
    summary: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Lead(Base):
    """Pedido de contato do plano Enterprise (sempre atendimento direto)."""
    __tablename__ = "leads"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(254))
    company: Mapped[str] = mapped_column(String(160))
    people: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str] = mapped_column(Text, default="")
    tenant_id: Mapped[str | None] = mapped_column(ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
