from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator

from app.schemas import Input, Schema

from .domain import MAX_CAST, MAX_SCENES, MAX_SIGNALS, MAX_TRAITS

Stance = Literal["colaborativa", "direta", "cetica", "apressada", "acolhedora"]
Tone = Literal["colaborativo", "neutro", "tenso"]
VoiceTone = Literal["serena", "dinamica", "objetiva", "calorosa", "firme"]


def _clean_list(values: list[str]) -> list[str]:
    out: list[str] = []
    for v in values:
        v = " ".join(v.split())
        if v and v not in out:
            out.append(v)
    return out


class PointIn(Input):
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=400)
    signals: list[str] = Field(default_factory=list, max_length=MAX_SIGNALS)
    weight: int = Field(default=3, ge=1, le=5)

    @field_validator("signals")
    @classmethod
    def clean(cls, v: list[str]) -> list[str]:
        v = _clean_list(v)
        if any(len(s) > 160 for s in v):
            raise ValueError("sinal longo demais")
        return v


class PointOut(Schema):
    id: str
    name: str
    description: str
    signals: list[str]
    weight: int
    in_use: bool = False


class PersonaIn(Input):
    name: str = Field(min_length=2, max_length=40)
    role: str = Field(min_length=2, max_length=60)
    traits: list[str] = Field(default_factory=list, max_length=MAX_TRAITS)
    speaking_style: str = Field(default="", max_length=400)
    stance: Stance = "colaborativa"
    voice_tone: VoiceTone = "serena"
    voice_id: str = Field(default="", max_length=80)
    look: int = Field(default=1, ge=0, le=5)

    @field_validator("traits")
    @classmethod
    def clean(cls, v: list[str]) -> list[str]:
        v = _clean_list(v)
        if any(len(s) > 40 for s in v):
            raise ValueError("traço longo demais")
        return v


class PersonaOut(Schema):
    id: str
    name: str
    role: str
    traits: list[str]
    speaking_style: str
    stance: str
    voice_tone: str
    voice_id: str
    voice_verified: bool = False
    look: int
    in_use: bool = False


class SceneIn(Input):
    id: str = Field(default="", max_length=32, pattern=r"^[a-z0-9-]*$")
    persona_id: str = Field(min_length=1, max_length=32)
    line: str = Field(min_length=10, max_length=400)
    point_ids: list[str] = Field(default_factory=list, max_length=6)


class ScenarioIn(Input):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(default="", max_length=400)
    pressure: int = Field(default=3, ge=1, le=5)
    tone: Tone = "neutro"
    point_ids: list[str] = Field(default_factory=list, max_length=12)
    scenes: list[SceneIn] = Field(min_length=1, max_length=MAX_SCENES)


class SceneOut(Schema):
    id: str
    persona_id: str
    line: str
    point_ids: list[str]


class ScenarioOut(Schema):
    id: str
    title: str
    description: str
    pressure: int
    tone: str
    point_ids: list[str]
    scenes: list[SceneOut]
    status: str
    version: int
    published_at: datetime | None
    dirty: bool = False
    cast_size: int = 0


class AnswerIn(Input):
    scene_id: str = Field(min_length=1, max_length=32)
    text: str = Field(min_length=1)

    @field_validator("text")
    @classmethod
    def size(cls, v: str) -> str:
        if len(v) > 2000:
            raise ValueError("resposta longa demais")
        return v


class StartIn(Input):
    scenario_id: str = Field(min_length=1, max_length=32)


class ShareIn(Input):
    share: bool


MAX_CAST_SIZE = MAX_CAST
