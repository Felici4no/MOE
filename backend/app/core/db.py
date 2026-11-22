from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


def make_engine(url: str):
    if url.startswith("sqlite:///"):
        Path(url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
        engine = create_engine(url, connect_args={"check_same_thread": False})

        @event.listens_for(engine, "connect")
        def _pragma(conn, _):
            conn.execute("PRAGMA foreign_keys=ON")
        return engine
    return create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=5)


class Database:
    def __init__(self, url: str):
        self.engine = make_engine(url)
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)

    def create_all(self) -> None:
        from app import models  # noqa: F401  registra as tabelas
        Base.metadata.create_all(self.engine)
        self._add_missing_columns()

    def _add_missing_columns(self) -> None:
        """Migração aditiva mínima: cria colunas novas em tabelas existentes (sem Alembic no MVP)."""
        from sqlalchemy import inspect, text
        inspector = inspect(self.engine)
        with self.engine.begin() as conn:
            for table in Base.metadata.sorted_tables:
                current = {c["name"]: c for c in inspector.get_columns(table.name)}
                for column in table.columns:
                    if column.name in current:
                        old = getattr(current[column.name]["type"], "length", None)
                        new = getattr(column.type, "length", None)
                        if old and new and new > old and self.engine.dialect.name == "postgresql":
                            conn.execute(text(f"ALTER TABLE {table.name} ALTER COLUMN {column.name} TYPE VARCHAR({new})"))
                        continue
                    ddl = column.type.compile(dialect=self.engine.dialect)
                    default = column.default.arg if column.default is not None and not callable(column.default.arg) else None
                    if isinstance(default, str):
                        suffix = f" DEFAULT '{default}'"
                    elif isinstance(default, bool):
                        suffix = f" DEFAULT {'TRUE' if default else 'FALSE'}"
                    elif isinstance(default, int):
                        suffix = f" DEFAULT {default}"
                    else:
                        suffix = ""
                    conn.execute(text(f'ALTER TABLE {table.name} ADD COLUMN {column.name} {ddl}{suffix}'))

    def session(self) -> Iterator[Session]:
        with self.sessions() as session:
            yield session
