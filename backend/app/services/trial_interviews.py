"""Testes livres da conta mestre (PF_INTERVIEW_MASTER_USER_ID), sem gastar cota de empresa."""
from app.core.config import Settings
from app.domain.tests import TESTS_BY_ID
from app.models import User
from app.repositories import Users


def trial_enabled_for(settings: Settings, user: User) -> bool:
    return bool(settings.interview_master_user_id) and user.id == settings.interview_master_user_id


def available_trial_kinds(settings: Settings, users: Users, user: User) -> list[str]:
    return list(TESTS_BY_ID) if trial_enabled_for(settings, user) else []
