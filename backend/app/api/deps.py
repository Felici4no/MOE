from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import issue_token, read_token
from app.models import User
from app.services.errors import ServiceError

COOKIE = "pf_session"


def settings(request: Request) -> Settings:
    return request.app.state.settings


def db(request: Request) -> Iterator[Session]:
    yield from request.app.state.db.session()


SettingsDep = Annotated[Settings, Depends(settings)]
DbDep = Annotated[Session, Depends(db)]


def current_user(request: Request, session: DbDep, cfg: SettingsDep) -> User:
    user_id = read_token(cfg.jwt_secret.get_secret_value(), request.cookies.get(COOKIE, ""))
    user = session.get(User, user_id) if user_id else None
    if not user:
        raise ServiceError(401, "Sua sessão terminou. Entre novamente.")
    return user


UserDep = Annotated[User, Depends(current_user)]


def start_session(response: Response, cfg: Settings, user: User) -> None:
    response.set_cookie(COOKIE, issue_token(cfg.jwt_secret.get_secret_value(), user.id, cfg.session_days),
                        httponly=True, secure=cfg.secure_cookies, samesite="lax",
                        max_age=cfg.session_days * 86400, path="/")


def end_session(response: Response, cfg: Settings) -> None:
    response.delete_cookie(COOKIE, path="/", secure=cfg.secure_cookies, httponly=True, samesite="lax")
