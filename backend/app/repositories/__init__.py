"""Consultas reutilizáveis; services não montam SQL espalhado."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (Credit, CreditStatus, Interview, Invite, Membership, Result, Role, Tenant, User)


class Users:
    def __init__(self, db: Session):
        self.db = db

    def by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))

    def get(self, user_id: str) -> User | None:
        return self.db.get(User, user_id)

    def membership(self, user_id: str) -> Membership | None:
        return self.db.scalar(select(Membership).where(Membership.user_id == user_id))

    def available_credits(self, user_id: str) -> int:
        return self.db.scalar(select(func.count()).select_from(Credit).where(
            Credit.user_id == user_id, Credit.status == CreditStatus.available)) or 0

    def available_by_kind(self, user_id: str) -> dict[str, int]:
        rows = self.db.execute(select(Credit.kind, func.count()).where(
            Credit.user_id == user_id, Credit.status == CreditStatus.available).group_by(Credit.kind)).all()
        out: dict[str, int] = {}
        for kind, n in rows:  # créditos antigos não tinham kind
            out[kind or "completa"] = out.get(kind or "completa", 0) + n
        return out

    def lock_for_interview(self, user_id: str) -> None:
        self.db.scalar(select(User.id).where(User.id == user_id).with_for_update())

    def claimed_trial_kinds(self, user_id: str) -> set[str]:
        return set(self.db.scalars(select(Credit.kind).where(
            Credit.user_id == user_id, Credit.source == "trial")))

    def next_credit(self, user_id: str, kind: str | None = None) -> Credit | None:
        query = select(Credit).where(Credit.user_id == user_id, Credit.status == CreditStatus.available)
        if kind:
            query = query.where(func.coalesce(Credit.kind, "completa") == kind)
        return self.db.scalar(query.order_by(Credit.created_at).with_for_update())


class Tenants:
    def __init__(self, db: Session):
        self.db = db

    def slug_taken(self, slug: str) -> bool:
        return self.db.scalar(select(Tenant.id).where(Tenant.slug == slug)) is not None

    def invites(self, tenant_id: str) -> list[Invite]:
        return list(self.db.scalars(select(Invite).where(Invite.tenant_id == tenant_id)
                                    .order_by(Invite.created_at.desc())))

    def invite_by_hash(self, token_hash: str) -> Invite | None:
        return self.db.scalar(select(Invite).where(Invite.token_hash == token_hash))

    def people(self, tenant_id: str) -> list[tuple[Membership, User]]:
        return list(self.db.execute(select(Membership, User).join(User, User.id == Membership.user_id)
                                    .where(Membership.tenant_id == tenant_id)
                                    .order_by(Membership.role != Role.owner, User.name)).tuples())


class Interviews:
    def __init__(self, db: Session):
        self.db = db

    def for_user(self, user_id: str) -> list[Interview]:
        return list(self.db.scalars(select(Interview).where(Interview.user_id == user_id)
                                    .order_by(Interview.created_at.desc())))

    def latest_for(self, user_id: str, tenant_id: str) -> Interview | None:
        return self.db.scalar(select(Interview).where(Interview.user_id == user_id, Interview.tenant_id == tenant_id)
                              .order_by(Interview.created_at.desc()).limit(1))

    def from_credit_source(self, user_id: str, source: str, source_ref: str) -> Interview | None:
        return self.db.scalar(select(Interview).join(Credit, Interview.credit_id == Credit.id).where(
            Interview.user_id == user_id, Credit.source == source, Credit.source_ref == source_ref))

    def result(self, interview_id: str) -> Result | None:
        return self.db.scalar(select(Result).where(Result.interview_id == interview_id))
