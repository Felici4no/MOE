"""Cadastro e login dos dois portais: Empresa (B2B) e Individual (B2C)."""
import re
import unicodedata
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import digest, hash_password, verify_password
from app.models import (AccountKind, Credit, InviteStatus, Membership, Role, Tenant, User)
from app.repositories import Tenants, Users
from app.domain.tests import TESTS
from app.schemas import CompanySignup, IndividualSignup, InviteAccept, Login, Me, TenantOut, TestInfo
from .errors import ServiceError
from .trial_interviews import available_trial_kinds, trial_enabled_for

LOGIN_FAILED = "E-mail ou senha incorretos para este portal."


def slugify(text: str) -> str:
    base = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")[:60] or "empresa"


class Accounts:
    def __init__(self, db: Session, settings: Settings):
        self.db, self.settings = db, settings
        self.users, self.tenants = Users(db), Tenants(db)

    def _create_user(self, name: str, email: str, password: str, kind: AccountKind) -> User:
        if self.users.by_email(email):
            raise ServiceError(409, "Já existe uma conta com este e-mail. Entre pelo seu portal.")
        user = User(name=name, email=email, password_hash=hash_password(password), kind=kind)
        self.db.add(user)
        return user

    def signup_individual(self, data: IndividualSignup) -> User:
        user = self._create_user(data.name, data.email, data.password, AccountKind.individual)
        self._commit()
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
        invite = self.tenants.invite_by_hash(digest(data.token))
        if not invite or invite.status != InviteStatus.sent:
            raise ServiceError(410, "Este convite não está mais disponível. Peça um novo à sua empresa.")
        if invite.expires_at.replace(tzinfo=invite.expires_at.tzinfo or UTC) < datetime.now(UTC):
            invite.status, invite.status_at = InviteStatus.expired, datetime.now(UTC)
            self.db.commit()
            raise ServiceError(410, "Este convite expirou. Peça um novo à sua empresa.")
        user = self._create_user(data.name, invite.email, data.password, AccountKind.member)
        self.db.flush()
        self.db.add(Membership(tenant_id=invite.tenant_id, user_id=user.id, role=Role.participant))
        for kind in invite.tests or ["completa"]:
            self.db.add(Credit(user_id=user.id, tenant_id=invite.tenant_id, source="invite",
                               source_ref=f"{invite.id}:{kind}", kind=kind))
        invite.status, invite.used_by, invite.status_at = InviteStatus.used, user.id, datetime.now(UTC)
        self._commit()
        return user

    def login(self, data: Login) -> User:
        user = self.users.by_email(data.email)
        if not verify_password(data.password, user.password_hash if user else None):
            raise ServiceError(401, LOGIN_FAILED)
        expected = AccountKind.member if data.portal == "empresa" else AccountKind.individual
        if user.kind != expected:
            other = "Individual" if user.kind == AccountKind.individual else "Empresa"
            raise ServiceError(409, f"Esta conta é do portal {other}. Entre por lá.")
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
                  individual_checkout_available=self.settings.individual_checkout_available,
                  free_interview_testing=trial_enabled_for(self.settings, user),
                  can_restart_interviews=user.id == self.settings.interview_master_user_id)

    def _commit(self) -> None:
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise ServiceError(409, "Já existe uma conta com este e-mail. Entre pelo seu portal.") from None
