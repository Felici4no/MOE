import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

_hasher = PasswordHasher()
# Hash fixo para igualar o tempo de resposta quando o e-mail não existe.
_DUMMY = _hasher.hash("pontos-fortes-dummy-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, hashed: str | None) -> bool:
    try:
        return _hasher.verify(hashed or _DUMMY, password) and hashed is not None
    except (VerifyMismatchError, InvalidHashError):
        return False


def issue_token(secret: str, user_id: str, days: int) -> str:
    now = datetime.now(UTC)
    return jwt.encode({"sub": user_id, "iat": now, "exp": now + timedelta(days=days)}, secret, algorithm="HS256")


def read_token(secret: str, token: str) -> str | None:
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])["sub"]
    except jwt.PyJWTError:
        return None


def new_secret() -> str:
    return secrets.token_urlsafe(32)


def digest(value: str) -> str:
    """Tokens de convite e de ferramenta são guardados apenas como hash."""
    return hashlib.sha256(value.encode()).hexdigest()
