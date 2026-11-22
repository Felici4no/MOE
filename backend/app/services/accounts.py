"""Cadastro da empresa, aceite de convite de vaga e login."""
import re
import unicodedata
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import digest, hash_password, verify_password
from app.models import (AccountKind, Candidate, Credit, InviteStatus, Membership, Role, Tenant, User)
from app.repositories import Tenants, Users
from app.domain.tests import TESTS, TESTS_BY_ID
from app.schemas import CompanySignup, InviteAccept, Login, Me, TenantOut, TestInfo
from .errors import ServiceError
from .trial_interviews import available_trial_kinds, trial_enabled_for

LOGIN_FAILED = "E-mail ou senha incorretos."


def slugify(text: str) -> str:
    base = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")[:60] or "empresa"


class Accounts:
    def __init__(self, db: Session, settings: Settings):
        self.db, self.settings = db, settings
        self.users, self.tenants = Users(db), Tenants(db)

    def _create_user(self, name: str, email: str, password: str, kind: AccountKind) -> User:
        if self.users.by_email(email):
            raise ServiceError(409, "Já existe uma conta com este e-mail. Entre com ela.")
        user = User(name=name, email=email, password_hash=hash_password(password), kind=kind)
        self.db.add(user)
        return user

    def signup_company(self, data: CompanySignup) -> User:
        user = self._create_user(data.name, data.email, data.password, AccountKind.member)
        slug, n = slugify(data.company), 1
        while self.tenants.slug_taken(slug):
            n += 1
            slug = f"{slugify(data.company)[:55]}-{n}"
        tenant = Tenant(name=data.company, slug=slug)
        self.db.add(tenant)
        self.db.flush()
        self.db.add(Membership(tenant_id=tenant.id, user_id=user.id, role=Role.owner))
        self._commit()
        return user

    def accept_invite(self, data: InviteAccept) -> User:
        """Cria a conta do candidato ou, se o e-mail já tem conta, confere a senha e soma a nova vaga."""
        invite = self.tenants.invite_by_hash(digest(data.token))
        if not invite or invite.status != InviteStatus.sent:
            raise ServiceError(410, "Este convite não está mais disponível. Peça um novo à empresa.")
        if invite.expires_at.replace(tzinfo=invite.expires_at.tzinfo or UTC) < datetime.now(UTC):
            invite.status, invite.status_at = InviteStatus.expired, datetime.now(UTC)
            self.db.commit()
            raise ServiceError(410, "Este convite expirou. Peça um novo à empresa.")
        if invite.job_id and not data.consent:
            raise ServiceError(422, "Para participar da vaga, autorize a empresa a ver a sua análise.")
        user = self.users.by_email(invite.email)
        if user:
            if not verify_password(data.password, user.password_hash):
                raise ServiceError(401, "Este e-mail já tem conta. Digite a senha dela para aceitar o convite.")
            if user.kind != AccountKind.member:
                raise ServiceError(409, "Esta conta não pode aceitar convites de vaga.")
        else:
            if len(data.name) < 2:
                raise ServiceError(422, "Confira os campos: name.")
            if len(data.password) < 10:
                raise ServiceError(422, "A senha precisa ter pelo menos 10 caracteres.")
            user = self._create_user(data.name, invite.email, data.password, AccountKind.member)
        self.db.flush()
        if not self.db.scalar(select(Membership).where(Membership.tenant_id == invite.tenant_id,
                                                       Membership.user_id == user.id)):
            self.db.add(Membership(tenant_id=invite.tenant_id, user_id=user.id, role=Role.participant))
        for kind in invite.tests or ["completa"]:
            if kind not in TESTS_BY_ID:
                continue  # "simulacao": a vaga é jogada no escritório (MOE), não com a Lia
            self.db.add(Credit(user_id=user.id, tenant_id=invite.tenant_id, job_id=invite.job_id, source="invite",
                               source_ref=f"{invite.id}:{kind}", kind=kind))
        invite.status, invite.used_by, invite.status_at = InviteStatus.used, user.id, datetime.now(UTC)
        if invite.job_id:
            candidate = self.db.scalar(select(Candidate).where(Candidate.invite_id == invite.id))
            if candidate:
                candidate.user_id, candidate.consent_at = user.id, datetime.now(UTC)
                if not candidate.name:
                    candidate.name = user.name
        self._commit()
        return user

    def login(self, data: Login) -> User:
        user = self.users.by_email(data.email)
        if not verify_password(data.password, user.password_hash if user else None):
            raise ServiceError(401, LOGIN_FAILED)
        if user.kind != AccountKind.member:
            raise ServiceError(409, "O MOE agora atende só empresas. Peça um convite de vaga à empresa.")
        return user

    def me(self, user: User) -> Me:
        membership = self.users.membership(user.id)
        tenant = None
        if membership:
            tenant = TenantOut(id=membership.tenant.id, name=membership.tenant.name,
                               slug=membership.tenant.slug, role=membership.role.value)
        by_kind = self.users.available_by_kind(user.id)
        trial_kinds = available_trial_kinds(self.settings, self.users, user)
        tests = [TestInfo(id=t.id, name=t.name, minutes=t.minutes, description=t.description,
                          available=by_kind.get(t.id, 0) + (t.id in trial_kinds))
                 for t in TESTS if by_kind.get(t.id) or t.id in trial_kinds]
        return Me(id=user.id, name=user.name, email=user.email, kind=user.kind.value, tenant=tenant,
                  credits=sum(by_kind.values()), tests=tests, stripe_enabled=self.settings.stripe_ready,
                  free_interview_testing=trial_enabled_for(self.settings, user),
                  can_restart_interviews=user.id == self.settings.interview_master_user_id)

    def _commit(self) -> None:
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise ServiceError(409, "Já existe uma conta com este e-mail. Entre com ela.") from None
