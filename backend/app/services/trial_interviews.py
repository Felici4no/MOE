"""Acesso gratuito às entrevistas durante a pausa das compras individuais."""
from app.core.config import Settings
from app.domain.tests import TESTS_BY_ID
from app.models import AccountKind, User
from app.repositories import Users


def trial_enabled_for(settings: Settings, user: User) -> bool:
    return not settings.interview_payments_enabled and (
        user.kind == AccountKind.individual or user.id == settings.interview_master_user_id)


def available_trial_kinds(settings: Settings, users: Users, user: User) -> list[str]:
    if not trial_enabled_for(settings, user):
        return []
    if user.id == settings.interview_master_user_id:
        return list(TESTS_BY_ID)
    claimed = users.claimed_trial_kinds(user.id)
    return [kind for kind in TESTS_BY_ID if kind not in claimed]
