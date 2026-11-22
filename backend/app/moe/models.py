"""Tabelas do MOE. Tudo pertence a um locatário; sessões pertencem também à pessoa."""
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models import now, uid


class MoePoint(Base):
    """Ponto que a empresa quer explorar na simulação (comportamento observável, nunca nota)."""
    __tablename__ = "moe_points"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text, default="")
    signals: Mapped[list] = mapped_column(JSON, default=list)       # comportamentos observáveis
    weight: Mapped[int] = mapped_column(Integer, default=3)          # 1..5: prioridade de foco, não pontuação
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class MoePersona(Base):
    """Personagem do escritório: personalidade + perfil de voz + aparência do Pixel Agents."""
    __tablename__ = "moe_personas"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(40))
    role: Mapped[str] = mapped_column(String(60))
    traits: Mapped[list] = mapped_column(JSON, default=list)
    speaking_style: Mapped[str] = mapped_column(Text, default="")
    stance: Mapped[str] = mapped_column(String(20), default="colaborativa")
    voice_tone: Mapped[str] = mapped_column(String(20), default="serena")
    voice_id: Mapped[str] = mapped_column(String(80), default="")   # id real do fornecedor de TTS, ou vazio
    look: Mapped[int] = mapped_column(Integer, default=1)            # perfil de personagem do Pixel Agents
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class MoeScenario(Base):
    """Cenário editável. Ao publicar, um retrato (snapshot) congela cenas, personagens e pontos."""
    __tablename__ = "moe_scenarios"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    pressure: Mapped[int] = mapped_column(Integer, default=3)        # 1..5
    tone: Mapped[str] = mapped_column(String(20), default="neutro")
    point_ids: Mapped[list] = mapped_column(JSON, default=list)
    scenes: Mapped[list] = mapped_column(JSON, default=list)          # [{id, persona_id, line, point_ids}]
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | published
    version: Mapped[int] = mapped_column(Integer, default=0)
    published: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class MoeSession(Base):
    """Uma pessoa jogando um cenário publicado. A análise é dela; a empresa só vê com consentimento."""
    __tablename__ = "moe_sessions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    scenario_id: Mapped[str] = mapped_column(ForeignKey("moe_scenarios.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    snapshot: Mapped[dict] = mapped_column(JSON)
    answers: Mapped[list] = mapped_column(JSON, default=list)        # [{scene_id, quote, at}]
    status: Mapped[str] = mapped_column(String(20), default="playing")  # playing | finished
    analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    wellbeing_alert: Mapped[bool] = mapped_column(Boolean, default=False)
    share_with_tenant: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
