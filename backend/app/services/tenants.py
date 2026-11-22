"""Gestão da empresa: cota, convites e acompanhamento das pessoas."""
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import digest, new_secret
from app.domain.plans import PLANS_BY_ID, TRIAL_INVITES
from collections import Counter

from app.domain.taxonomy import DOMAINS_BY_ID, THEMES_BY_ID
from app.models import Interview, InterviewStatus, Invite, InviteStatus, Membership, Result, Role, User
from app.repositories import Interviews, Tenants, Users
from sqlalchemy import select

from app.schemas import (Count, Funnel, InviteCreate, InviteOut, InvitePreview, PersonRow, TenantAnalytics, TenantBilling,
                         Week)
from app.domain.tests import TESTS_BY_ID
from app.schemas import TestInfo
from .guardrails import LABELS
from .mailer import Mailer
from .errors import ServiceError, forbidden, not_found

INVITE_DAYS = 14


class TenantAdmin:
    def __init__(self, db: Session, settings: Settings, user: User):
        self.db, self.settings, self.user = db, settings, user
        self.tenants, self.interviews = Tenants(db), Interviews(db)
        membership = Users(db).membership(user.id)
        if not membership or membership.role not in (Role.owner, Role.admin):
            raise forbidden()
        self.membership: Membership = membership

    @property
    def tenant_id(self) -> str:
        return self.membership.tenant_id

    def billing(self) -> TenantBilling:
        tenant = self.membership.tenant
        invites = self.tenants.invites(self.tenant_id)
        plan = PLANS_BY_ID.get(tenant.plan)
        active = tenant.subscription_status in ("active", "trialing") and plan is not None
        if active:
            start = tenant.period_start.replace(tzinfo=tenant.period_start.tzinfo or UTC) if tenant.period_start else None
            used = sum(len(i.tests or ["completa"]) for i in invites
                       if not start or i.created_at.replace(tzinfo=i.created_at.tzinfo or UTC) >= start)
            limit = plan.interviews
        else:
            used, limit = sum(len(i.tests or ["completa"]) for i in invites), TRIAL_INVITES
        return TenantBilling(plan=plan.id if active else "", plan_name=plan.name if active else "Teste",
                             status=tenant.subscription_status or "none", period_end=tenant.period_end,
                             used=used, limit=limit, trial=not active,
                             portal=bool(tenant.stripe_customer_id) and self.settings.stripe_ready)

    def invite(self, data: InviteCreate) -> InviteOut:
        quota = self.billing()
        if quota.limit is not None and quota.used >= quota.limit:
            if quota.trial:
                raise ServiceError(402, f"O teste gratuito permite {TRIAL_INVITES} convites. Assine um plano para convidar mais pessoas.")
            raise ServiceError(402, "Você usou as entrevistas do plano neste mês. Troque de plano ou aguarde a renovação.")
        if Users(self.db).by_email(data.email):
            raise ServiceError(409, "Este e-mail já tem conta no Resona.")
        for existing in self.tenants.invites(self.tenant_id):
            if existing.email == data.email and existing.status == InviteStatus.sent:
                raise ServiceError(409, "Já existe um convite ativo para este e-mail.")
        tests = list(dict.fromkeys(data.tests))
        if quota.limit is not None and quota.used + len(tests) > quota.limit:
            raise ServiceError(402, f"Restam {quota.limit - quota.used} entrevistas na cota; este convite usa {len(tests)}.")
        invite = Invite(tenant_id=self.tenant_id, email=data.email, name=data.name, token_hash="", tests=tests,
                        invited_by=self.user.id, expires_at=datetime.now(UTC))
        self.db.add(invite)
        return self._issue(invite)

    def resend(self, invite_id: str) -> InviteOut:
        """Gera link novo (o anterior deixa de valer), renova a validade e reenvia o e-mail."""
        invite = self.db.get(Invite, invite_id)
        if not invite or invite.tenant_id != self.tenant_id:
            raise not_found("Convite")
        if invite.status not in (InviteStatus.sent, InviteStatus.expired):
            raise ServiceError(409, "Só convites enviados ou expirados podem ser reenviados.")
        invite.status = InviteStatus.sent
        return self._issue(invite)

    def _issue(self, invite: Invite, job: str | None = None) -> InviteOut:
        token = new_secret()
        invite.token_hash = digest(token)
        invite.expires_at = datetime.now(UTC) + timedelta(days=INVITE_DAYS)
        invite.status_at = datetime.now(UTC)
        self.db.commit()
        link = f"{self.settings.public_url}/convite/{token}"
        tests = [TESTS_BY_ID[t] for t in invite.tests or ["completa"] if t in TESTS_BY_ID]
        emailed = Mailer(self.settings).invite(invite.email, invite.name, self.membership.tenant.name, link,
                                               invite.expires_at.strftime("%d/%m/%Y"), tests, job=job)
        out = InviteOut.model_validate(invite)
        # O link só é mostrado nesta resposta; o banco guarda apenas o hash.
        out.link, out.emailed = link, emailed
        return out

    def invites(self) -> list[InviteOut]:
        now = datetime.now(UTC)
        rows = self.tenants.invites(self.tenant_id)
        for invite in rows:
            if invite.status == InviteStatus.sent and invite.expires_at.replace(tzinfo=invite.expires_at.tzinfo or UTC) < now:
                invite.status, invite.status_at = InviteStatus.expired, now
        self.db.commit()
        return [InviteOut.model_validate(i) for i in rows]

    def revoke(self, invite_id: str) -> InviteOut:
        invite = self.db.get(Invite, invite_id)
        if not invite or invite.tenant_id != self.tenant_id:
            raise not_found("Convite")
        if invite.status != InviteStatus.sent:
            raise ServiceError(409, "Só convites enviados podem ser cancelados.")
        invite.status, invite.status_at = InviteStatus.revoked, datetime.now(UTC)
        self.db.commit()
        return InviteOut.model_validate(invite)

    def analytics(self, days: int) -> TenantAnalytics:
        """Só agregados. Talentos contam apenas Mapas compartilhados; alerta de bem-estar nunca aparece."""
        now = datetime.now(UTC)
        since = now - timedelta(days=days) if days else None
        aware = lambda d: d.replace(tzinfo=d.tzinfo or UTC) if d else None  # noqa: E731
        within = lambda d: since is None or (d is not None and aware(d) >= since)  # noqa: E731
        invites = [i for i in self.tenants.invites(self.tenant_id) if within(i.created_at)]
        interviews = [i for i in self.db.scalars(select(Interview).where(Interview.tenant_id == self.tenant_id))
                      if within(i.created_at)]
        started = [i for i in interviews if i.attempts]
        completed = [i for i in interviews if i.status == InterviewStatus.analyzed]
        cancelled = [i for i in interviews if i.status == InterviewStatus.cancelled]

        def minutes(interview: Interview) -> float:
            total = 0.0
            for a in interview.attempts or []:
                if a.get("started_at") and a.get("ended_at"):
                    total += (datetime.fromisoformat(a["ended_at"]) - datetime.fromisoformat(a["started_at"])).total_seconds()
            return total / 60
        durations = [m for m in map(minutes, completed) if m > 0]
        attempts = Counter(len(i.attempts or []) for i in started)
        reasons = Counter(a.get("end_reason") or "em andamento" for i in started for a in i.attempts or [])
        reason_label = {"completed": "Concluída", "dropped": "Queda de conexão", "left": "Saiu da página",
                        "guardrail": "Cancelada por advertências", "silence": "Sem resposta por 30 s", "restart": "Reiniciada",
                        "em andamento": "Em andamento"}
        violations = [v for i in interviews for v in i.violations or []]
        by_kind = Counter(v["kind"] for v in violations)

        shared = [i for i in completed if i.share_with_tenant]
        results = {r.interview_id: r for r in self.db.scalars(
            select(Result).where(Result.interview_id.in_([i.id for i in shared])))} if shared else {}
        talents, domains, paths = Counter(), Counter(), Counter()
        for result in results.values():
            if result.wellbeing_alert:
                continue
            for t in result.themes:
                if t["id"] in THEMES_BY_ID:
                    talents[t["id"]] += 1
                    domains[THEMES_BY_ID[t["id"]].domain] += 1
            for p in result.paths or []:
                paths[p["name"]] += 1

        weeks = []
        for back in range(7, -1, -1):
            start = (now - timedelta(days=now.weekday(), weeks=back)).replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(weeks=1)
            weeks.append(Week(week=start.strftime("%d/%m"),
                              invited=sum(1 for i in self.tenants.invites(self.tenant_id) if start <= aware(i.created_at) < end),
                              completed=sum(1 for i in interviews if i.status == InterviewStatus.analyzed and i.ended_at
                                            and start <= aware(i.ended_at) < end)))
        return TenantAnalytics(
            days=days,
            funnel=Funnel(invited=len(invites), accepted=sum(1 for i in invites if i.status == InviteStatus.used),
                          started=len(started), completed=len(completed), cancelled=len(cancelled)),
            completion_rate=round(len(completed) / len(started), 3) if started else None,
            avg_minutes=round(sum(durations) / len(durations), 1) if durations else None,
            attempts=[Count(label=f"{n} tentativa{'s' if n > 1 else ''}", key=str(n), value=attempts.get(n, 0)) for n in (1, 2, 3)],
            end_reasons=[Count(label=reason_label.get(k, k), key=k, value=v) for k, v in reasons.most_common()],
            violations_total=len(violations),
            interviews_with_violations=sum(1 for i in interviews if i.violations),
            violations_by_kind=[Count(label=LABELS.get(k, k), key=k, value=v) for k, v in by_kind.most_common()],
            shared_profiles=len([r for r in results.values() if not r.wellbeing_alert]),
            talents=[Count(label=THEMES_BY_ID[k].name, key=THEMES_BY_ID[k].domain, value=v) for k, v in talents.most_common()],
            domains=[Count(label=DOMAINS_BY_ID[d].name, key=d, value=domains.get(d, 0)) for d in DOMAINS_BY_ID],
            paths=[Count(label=k, value=v) for k, v in paths.most_common()],
            weekly=weeks)

    def people(self) -> list[PersonRow]:
        rows = []
        for membership, user in self.tenants.people(self.tenant_id):
            interview = self.interviews.latest_for(user.id, self.tenant_id)
            shared = bool(interview and interview.share_with_tenant)
            top = []
            if shared:
                result = self.interviews.result(interview.id)
                top = [THEMES_BY_ID[t["id"]].name for t in (result.themes if result and not result.wellbeing_alert else [])
                       if t["id"] in THEMES_BY_ID]
            rows.append(PersonRow(user_id=user.id, name=user.name, email=user.email, role=membership.role.value,
                                  interview_status=interview.status.value if interview else None,
                                  shared=shared, top_themes=top))
        return rows


def preview_invite(db: Session, token: str) -> InvitePreview:
    invite = Tenants(db).invite_by_hash(digest(token))
    if not invite or invite.status != InviteStatus.sent or \
            invite.expires_at.replace(tzinfo=invite.expires_at.tzinfo or UTC) < datetime.now(UTC):
        raise ServiceError(410, "Este convite não está mais disponível. Peça um novo à sua empresa.")
    from app.models import Job, Tenant
    tests = [TestInfo(id=t.id, name=t.name, minutes=t.minutes, description=t.description)
             for t in (TESTS_BY_ID[k] for k in invite.tests or ["completa"] if k in TESTS_BY_ID)]
    job = db.get(Job, invite.job_id) if invite.job_id else None
    return InvitePreview(company=db.get(Tenant, invite.tenant_id).name, email=invite.email, name=invite.name, tests=tests,
                         job=job.title if job else None, has_account=Users(db).by_email(invite.email) is not None)
