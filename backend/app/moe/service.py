"""Serviços do MOE: a empresa configura; a pessoa joga; a empresa só vê o que foi compartilhado."""
import re
import unicodedata

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models import Role, User, now
from app.repositories import Users
from app.services.errors import ServiceError, forbidden, not_found

from . import analysis, mind, template
from .domain import (LOOKS, MAX_CAST, MAX_POINTS_PER_TENANT, MAX_PERSONAS_PER_TENANT, PRESSURE, STANCES, TONES,
                     VOICE_TONES, sensitive_terms, voice_catalog)
from .models import MoePersona, MoePoint, MoeScenario, MoeSession
from .schemas import PersonaIn, PersonaOut, PointIn, PointOut, ScenarioIn, ScenarioOut, SceneOut


def _cols(obj) -> dict:
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


def _blocked(*texts: str) -> None:
    terms = sensitive_terms(*texts)
    if terms:
        raise ServiceError(422, "O MOE não explora temas pessoais ou protegidos (ex.: " + ", ".join(terms[:3]) +
                           "). Reescreva focando no comportamento de trabalho.")


def _slug(text: str, taken: set[str]) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", text.casefold()).encode("ascii", "ignore").decode()).strip("-")[:24] or "cena"
    slug, n = base, 2
    while slug in taken:
        slug, n = f"{base}-{n}", n + 1
    return slug


class _Base:
    def __init__(self, db: Session, settings: Settings, user: User):
        self.db, self.settings, self.user = db, settings, user
        self.membership = Users(db).membership(user.id)
        if not self.membership:
            raise forbidden()

    @property
    def tenant_id(self) -> str:
        return self.membership.tenant_id


class MoeAdmin(_Base):
    """Somente donos e administradores do locatário."""

    def __init__(self, db: Session, settings: Settings, user: User):
        super().__init__(db, settings, user)
        if self.membership.role not in (Role.owner, Role.admin):
            raise forbidden()

    # --- catálogo ---------------------------------------------------------------
    def catalog(self) -> dict:
        return {"stances": STANCES, "tones": TONES, "voice_tones": VOICE_TONES, "pressure": PRESSURE, "looks": LOOKS,
                "voices": voice_catalog(self.settings.tts_vendor, self.settings.tts_voice), "max_cast": MAX_CAST}

    def _voice_ids(self) -> set[str]:
        return {v["id"] for v in voice_catalog(self.settings.tts_vendor, self.settings.tts_voice)["voices"]}

    # --- pontos -----------------------------------------------------------------
    def _points(self) -> list[MoePoint]:
        return list(self.db.scalars(select(MoePoint).where(MoePoint.tenant_id == self.tenant_id).order_by(MoePoint.weight.desc(), MoePoint.name)))

    def _get(self, model, oid: str, what: str):
        obj = self.db.get(model, oid)
        if not obj or obj.tenant_id != self.tenant_id:
            raise not_found(what)
        return obj

    def _scenarios(self) -> list[MoeScenario]:
        return list(self.db.scalars(select(MoeScenario).where(MoeScenario.tenant_id == self.tenant_id).order_by(MoeScenario.created_at)))

    def _used(self) -> tuple[set[str], set[str]]:
        points, personas = set(), set()
        for sc in self._scenarios():
            points.update(sc.point_ids)
            for s in sc.scenes:
                personas.add(s["persona_id"])
                points.update(s.get("point_ids", []))
        return points, personas

    def list_points(self) -> list[PointOut]:
        used = self._used()[0]
        return [PointOut.model_validate({**_cols(p), "in_use": p.id in used}) for p in self._points()]

    def save_point(self, data: PointIn, pid: str | None = None) -> PointOut:
        _blocked(data.name, data.description, *data.signals)
        if pid:
            point = self._get(MoePoint, pid, "Ponto")
        else:
            if len(self._points()) >= MAX_POINTS_PER_TENANT:
                raise ServiceError(409, f"Limite de {MAX_POINTS_PER_TENANT} pontos atingido.")
            point = MoePoint(tenant_id=self.tenant_id)
            self.db.add(point)
        for k, v in data.model_dump().items():
            setattr(point, k, v)
        self.db.commit()
        return PointOut.model_validate(_cols(point))

    def delete_point(self, pid: str) -> None:
        point = self._get(MoePoint, pid, "Ponto")
        if pid in self._used()[0]:
            raise ServiceError(409, "Este ponto está em um cenário. Tire-o do cenário antes de excluir.")
        self.db.delete(point)
        self.db.commit()

    # --- personagens ------------------------------------------------------------
    def _personas(self) -> list[MoePersona]:
        return list(self.db.scalars(select(MoePersona).where(MoePersona.tenant_id == self.tenant_id).order_by(MoePersona.name)))

    def _persona_out(self, p: MoePersona, used: set[str], voices: set[str]) -> PersonaOut:
        return PersonaOut.model_validate({**_cols(p), "in_use": p.id in used, "voice_verified": bool(p.voice_id) and p.voice_id in voices})

    def list_personas(self) -> list[PersonaOut]:
        used, voices = self._used()[1], self._voice_ids()
        return [self._persona_out(p, used, voices) for p in self._personas()]

    def save_persona(self, data: PersonaIn, pid: str | None = None) -> PersonaOut:
        _blocked(data.name, data.role, data.speaking_style, data.goal, *data.traits,
                 *(f"{c.topic} {c.probe} {c.ack}" for c in data.concerns))
        if data.voice_id and data.voice_id not in self._voice_ids():
            raise ServiceError(422, "Essa voz não está no catálogo configurado. Escolha uma voz da lista ou deixe em branco.")
        if pid:
            persona = self._get(MoePersona, pid, "Personagem")
        else:
            if len(self._personas()) >= MAX_PERSONAS_PER_TENANT:
                raise ServiceError(409, f"Limite de {MAX_PERSONAS_PER_TENANT} personagens atingido.")
            persona = MoePersona(tenant_id=self.tenant_id)
            self.db.add(persona)
        for k, v in data.model_dump().items():
            setattr(persona, k, v)
        persona.concerns = [c.model_dump() for c in data.concerns]
        self.db.commit()
        return self._persona_out(persona, self._used()[1], self._voice_ids())

    def delete_persona(self, pid: str) -> None:
        persona = self._get(MoePersona, pid, "Personagem")
        if pid in self._used()[1]:
            raise ServiceError(409, "Este personagem está em um cenário. Troque-o nas cenas antes de excluir.")
        self.db.delete(persona)
        self.db.commit()

    # --- cenários ---------------------------------------------------------------
    def _snapshot(self, sc: MoeScenario) -> dict:
        personas = {p.id: p for p in self._personas()}
        points = {p.id: p for p in self._points()}
        cast = list(dict.fromkeys(s["persona_id"] for s in sc.scenes))
        used_points = list(dict.fromkeys(sc.point_ids + [pid for s in sc.scenes for pid in s.get("point_ids", [])]))
        return {
            "id": sc.id, "title": sc.title, "description": sc.description, "pressure": sc.pressure, "tone": sc.tone,
            "follow_ups": bool(sc.follow_ups),
            "scenes": [dict(s) for s in sc.scenes],
            "personas": {pid: {k: getattr(personas[pid], k) for k in
                               ("id", "name", "role", "traits", "speaking_style", "stance", "voice_tone", "voice_id", "look",
                                "goal", "concerns", "memory")}
                         for pid in cast},
            "points": {pid: {k: getattr(points[pid], k) for k in ("id", "name", "description", "signals", "weight")}
                       for pid in used_points},
        }

    def _out(self, sc: MoeScenario) -> ScenarioOut:
        dirty = sc.status == "published" and sc.published is not None and \
            {k: v for k, v in self._snapshot(sc).items()} != sc.published
        from app.models import Job
        job = self.db.scalar(select(Job).where(Job.scenario_id == sc.id))
        return ScenarioOut(id=sc.id, title=sc.title, description=sc.description, pressure=sc.pressure, tone=sc.tone,
                           point_ids=sc.point_ids, scenes=[SceneOut(**s) for s in sc.scenes], status=sc.status,
                           version=sc.version, published_at=sc.published_at, dirty=dirty,
                           cast_size=len({s["persona_id"] for s in sc.scenes}), follow_ups=bool(sc.follow_ups),
                           job_title=job.title if job else None)

    def list_scenarios(self) -> list[ScenarioOut]:
        return [self._out(sc) for sc in self._scenarios()]

    def get_scenario(self, sid: str) -> ScenarioOut:
        return self._out(self._get(MoeScenario, sid, "Cenário"))

    def save_scenario(self, data: ScenarioIn, sid: str | None = None) -> ScenarioOut:
        personas = {p.id for p in self._personas()}
        points = {p.id for p in self._points()}
        _blocked(data.title, data.description, *(s.line for s in data.scenes))
        missing_p = [s.persona_id for s in data.scenes if s.persona_id not in personas]
        if missing_p:
            raise ServiceError(422, "Uma das cenas usa um personagem que não existe.")
        all_points = set(data.point_ids) | {p for s in data.scenes for p in s.point_ids}
        if all_points - points:
            raise ServiceError(422, "Um dos pontos escolhidos não existe.")
        if len({s.persona_id for s in data.scenes}) > MAX_CAST:
            raise ServiceError(422, f"Um cenário pode ter até {MAX_CAST} personagens no escritório.")
        taken: set[str] = set()
        scenes = []
        for s in data.scenes:
            sid_ = s.id if s.id and s.id not in taken else _slug(s.line.split("?")[0][:30], taken)
            taken.add(sid_)
            scenes.append({"id": sid_, "persona_id": s.persona_id, "line": " ".join(s.line.split()),
                           "point_ids": list(dict.fromkeys(s.point_ids)), "stage": " ".join(s.stage.split())})
        sc = self._get(MoeScenario, sid, "Cenário") if sid else MoeScenario(tenant_id=self.tenant_id)
        if not sid:
            self.db.add(sc)
        sc.title, sc.description, sc.pressure, sc.tone = data.title, data.description, data.pressure, data.tone
        sc.point_ids, sc.scenes = list(dict.fromkeys(data.point_ids)), scenes
        sc.follow_ups = data.follow_ups
        self.db.commit()
        return self._out(sc)

    def publish(self, sid: str) -> ScenarioOut:
        sc = self._get(MoeScenario, sid, "Cenário")
        snap = self._snapshot(sc)
        if not snap["points"]:
            raise ServiceError(422, "Escolha pelo menos um ponto para explorar antes de publicar.")
        sc.version += 1
        sc.status, sc.published, sc.published_at = "published", snap, now()
        self.db.commit()
        return self._out(sc)

    def unpublish(self, sid: str) -> ScenarioOut:
        sc = self._get(MoeScenario, sid, "Cenário")
        sc.status = "draft"
        self.db.commit()
        return self._out(sc)

    def delete_scenario(self, sid: str) -> None:
        self.db.delete(self._get(MoeScenario, sid, "Cenário"))
        self.db.commit()

    def from_template(self) -> ScenarioOut:
        """Cria pontos, personagens e o cenário S01 editáveis (reaproveita os que já existirem pelo nome)."""
        points = {p.name: p for p in self._points()}
        personas = {p.name: p for p in self._personas()}
        pid: dict[str, str] = {}
        for t in template.POINTS:
            p = points.get(t["name"]) or self.save_point(PointIn(**{k: t[k] for k in ("name", "description", "signals", "weight")}))
            pid[t["key"]] = p.id
        per: dict[str, str] = {}
        for t in template.PERSONAS:
            p = personas.get(t["name"]) or self.save_persona(PersonaIn(**{k: v for k, v in t.items() if k != "key"}))
            per[t["key"]] = p.id
        s = template.SCENARIO
        return self.save_scenario(ScenarioIn(
            title=s["title"], description=s["description"], pressure=s["pressure"], tone=s["tone"],
            point_ids=list(pid.values()),
            scenes=[{"id": sc["id"], "persona_id": per[sc["persona"]], "line": sc["line"],
                     "point_ids": [pid[k] for k in sc["points"]]} for sc in s["scenes"]]))

    # --- resultados compartilhados ---------------------------------------------
    def results(self) -> list[dict]:
        rows = self.db.execute(select(MoeSession, User).join(User, User.id == MoeSession.user_id).where(
            MoeSession.tenant_id == self.tenant_id, MoeSession.share_with_tenant.is_(True),
            MoeSession.wellbeing_alert.is_(False), MoeSession.status == "finished").order_by(MoeSession.finished_at.desc()))
        return [{"id": s.id, "person": u.name, "scenario": s.snapshot["title"], "version": s.version,
                 "finished_at": s.finished_at, "analysis": s.analysis,
                 "answers": [{"scene_id": a["scene_id"], "quote": a["quote"]} for a in s.answers]} for s, u in rows]


def _turns_per_scene(snap: dict) -> int:
    return 2 if snap.get("follow_ups") else 1


def _total_turns(snap: dict) -> int:
    return len(snap["scenes"]) * _turns_per_scene(snap)


def _pending(s: "MoeSession") -> tuple[dict, int] | None:
    """Cena e turno que esperam resposta (uma voz por vez)."""
    per = _turns_per_scene(s.snapshot)
    done = {(a["scene_id"], a.get("turn", 0)) for a in s.answers}
    for scene in s.snapshot["scenes"]:
        for turn in range(per):
            if (scene["id"], turn) not in done:
                return scene, turn
    return None


class MoePlayer(_Base):
    """Qualquer pessoa do locatário. Só enxerga as próprias sessões."""

    @property
    def _key(self) -> str:
        return self.settings.analyst_api_key.get_secret_value()

    def available(self) -> list[dict]:
        from app.models import Job
        rows = self.db.scalars(select(MoeScenario).where(MoeScenario.tenant_id == self.tenant_id, MoeScenario.status == "published"))
        out = []
        for sc in rows:
            job = self.db.scalar(select(Job).where(Job.scenario_id == sc.id))
            out.append({"id": sc.id, "title": sc.published["title"], "description": sc.published["description"],
                        "scenes": len(sc.published["scenes"]), "version": sc.version, "job_title": job.title if job else None,
                        "stages": list(dict.fromkeys(x.get("stage") or "" for x in sc.published["scenes"] if x.get("stage")))})
        return out

    def mine(self) -> list[dict]:
        rows = self.db.scalars(select(MoeSession).where(MoeSession.user_id == self.user.id).order_by(MoeSession.created_at.desc()))
        return [{"id": s.id, "title": s.snapshot["title"], "status": s.status, "answered": len(s.answers),
                 "scenes": _total_turns(s.snapshot), "share_with_tenant": s.share_with_tenant,
                 "created_at": s.created_at, "finished_at": s.finished_at} for s in rows]

    def _mine(self, sid: str) -> MoeSession:
        s = self.db.get(MoeSession, sid)
        if not s or s.user_id != self.user.id:
            raise not_found("Sessão")
        return s

    def view(self, s: MoeSession) -> dict:
        snap = s.snapshot
        per = _turns_per_scene(snap)
        answered = {(a["scene_id"], a.get("turn", 0)): a["quote"] for a in s.answers}
        pending = _pending(s)
        job_title = None
        if s.candidate_id:
            from app.models import Candidate, Job
            cand = self.db.get(Candidate, s.candidate_id)
            job = self.db.get(Job, cand.job_id) if cand else None
            job_title = job.title if job else None
        return {
            "id": s.id, "status": s.status, "version": s.version, "title": snap["title"], "description": snap["description"],
            "pressure": snap["pressure"], "tone": snap["tone"], "follow_ups": bool(snap.get("follow_ups")), "job_title": job_title,
            # O participante vê quem fala e o perfil de voz; os pontos explorados ficam ocultos até o fim.
            "cast": [{k: p[k] for k in ("id", "name", "role", "look", "voice_tone", "voice_id", "traits", "speaking_style", "stance")}
                     for p in snap["personas"].values()],
            "scenes": [{"id": sc["id"], "persona_id": sc["persona_id"], "line": sc["line"], "stage": sc.get("stage", ""),
                        "answered": all((sc["id"], t) in answered for t in range(per))} for sc in snap["scenes"]],
            # Falas dos personagens já ditas, com a resposta de cada uma (a última fica aberta).
            "turns": [{"scene_id": d["scene_id"], "turn": d["turn"], "persona_id": d["persona_id"], "line": d["text"],
                       "source": d.get("source", "roteiro"), "answer": answered.get((d["scene_id"], d["turn"]))}
                      for d in s.dialogue or [] if d["speaker"] == "npc"],
            "total_turns": _total_turns(snap),
            "current": {"scene_id": pending[0]["id"], "turn": pending[1]} if pending and s.status == "playing" else None,
            "answers": [{"scene_id": a["scene_id"], "turn": a.get("turn", 0), "quote": a["quote"]} for a in s.answers],
            "analysis": s.analysis if s.status == "finished" and not s.wellbeing_alert else None,
            "wellbeing_alert": s.wellbeing_alert,
            "share_with_tenant": s.share_with_tenant,
        }

    def start(self, scenario_id: str) -> dict:
        from app.services import hiring
        sc = self.db.get(MoeScenario, scenario_id)
        if not sc or sc.tenant_id != self.tenant_id or sc.status != "published" or not sc.published:
            raise not_found("Cenário")
        # Candidato de vaga: uma sessão por vaga; volta para a que já existe.
        existing = self.db.scalar(select(MoeSession).where(MoeSession.scenario_id == sc.id, MoeSession.user_id == self.user.id,
                                                           MoeSession.candidate_id.is_not(None)))
        if existing:
            return self.view(existing)
        s = MoeSession(tenant_id=self.tenant_id, scenario_id=sc.id, user_id=self.user.id, version=sc.version,
                       snapshot=sc.published, answers=[], dialogue=[])
        self.db.add(s)
        self.db.flush()
        candidate = hiring.link_session(self.db, s)
        s.candidate_id = candidate.id if candidate else None
        first = sc.published["scenes"][0]
        s.dialogue = [{"scene_id": first["id"], "turn": 0, "speaker": "npc", "persona_id": first["persona_id"],
                       **{k: v for k, v in mind.opening(sc.published, first, []).items() if k != "recalls"}}]
        self.db.commit()
        return self.view(s)

    def get(self, sid: str) -> dict:
        return self.view(self._mine(sid))

    def answer(self, sid: str, scene_id: str, text: str, turn: int | None = None) -> dict:
        s = self._mine(sid)
        if s.status != "playing":
            raise ServiceError(409, "Esta simulação já terminou.")
        pending = _pending(s)
        if not pending or pending[0]["id"] != scene_id or (turn is not None and pending[1] != turn):
            raise ServiceError(409, "Responda a cena atual da simulação.")
        quote = " ".join(text.split())
        if not quote:
            raise ServiceError(422, "Escreva sua resposta antes de enviar.")
        scene, turn = pending
        dialogue = list(s.dialogue or [])
        if not dialogue:  # sessões antigas, de antes da conversa viva
            dialogue = [{"scene_id": scene["id"], "turn": 0, "speaker": "npc", "persona_id": scene["persona_id"],
                         "text": scene["line"], "source": "roteiro"}]
        dialogue.append({"scene_id": scene["id"], "turn": turn, "speaker": "person", "persona_id": scene["persona_id"], "text": quote})
        s.answers = [*s.answers, {"scene_id": scene["id"], "turn": turn, "quote": quote, "at": now().isoformat()}]
        nxt = _pending(s)
        if nxt and nxt[0]["id"] == scene["id"]:
            reaction = mind.react(s.snapshot, scene, dialogue, quote, self._key, self.settings.analyst_model)
            dialogue.append({"scene_id": scene["id"], "turn": nxt[1], "speaker": "npc", "persona_id": scene["persona_id"],
                             "text": reaction["text"], "source": reaction["source"]})
        elif nxt:
            op = mind.opening(s.snapshot, nxt[0], dialogue)
            dialogue.append({"scene_id": nxt[0]["id"], "turn": 0, "speaker": "npc", "persona_id": nxt[0]["persona_id"],
                             "text": op["text"], "source": op["source"]})
        s.dialogue = dialogue
        self.db.commit()
        return self.view(s)

    def finish(self, sid: str) -> dict:
        from app.models import Candidate
        from app.services import hiring
        s = self._mine(sid)
        if s.status == "finished":
            return self.view(s)
        if _pending(s):
            raise ServiceError(409, "Ainda há cenas sem resposta.")
        result = analysis.analyze(s.snapshot, s.answers, self._key, self.settings.analyst_model, s.dialogue or [])
        s.wellbeing_alert = result["alert"]
        s.analysis = None if result["alert"] else result
        s.status, s.finished_at = "finished", now()
        s.share_with_tenant = False
        candidate = self.db.get(Candidate, s.candidate_id) if s.candidate_id else None
        if candidate and candidate.consent_at and not s.wellbeing_alert:
            s.share_with_tenant = True  # autorização dada ao aceitar o convite da vaga; dá para retirar
            self.db.flush()
            hiring.run_fit_session(self.db, self.settings, candidate)
            if candidate.fit and s.analysis is not None:
                s.analysis = {**s.analysis, "fit": candidate.fit}
        self.db.commit()
        return self.view(s)

    def share(self, sid: str, share: bool) -> dict:
        from app.models import Candidate
        from app.services import hiring
        s = self._mine(sid)
        if share and (s.status != "finished" or s.wellbeing_alert):
            raise ServiceError(409, "Esta experiência não pode ser compartilhada.")
        s.share_with_tenant = share
        candidate = self.db.get(Candidate, s.candidate_id) if s.candidate_id else None
        if candidate:
            candidate.consent_at = now() if share else None
            hiring.run_fit_session(self.db, self.settings, candidate)
        self.db.commit()
        return self.view(s)
