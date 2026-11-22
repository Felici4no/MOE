"""Ciclo da entrevista: crédito → até 3 tentativas na sala Agora → evidências → perfil.

Tentativas: cada entrada na sala abre uma tentativa com horário. Queda de conexão,
saída da página ou falta de sinal por 45 s fecham a tentativa como "dropped"; a pessoa
volta de onde parou. Depois da 3ª tentativa, a entrevista é finalizada com o que houver.
Guardrails: 3 advertências cancelam a entrevista (ver services/guardrails.py).
"""
import asyncio
import logging
import secrets
import time
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import digest, new_secret
from app.models import Credit, CreditStatus, Interview, InterviewStatus, Result, User
from app.repositories import Interviews, Users
from app.schemas import (EvidenceInput, InterviewOut, InterviewState, JoinOut, OffScriptInput, ResultOut, ThemeScore,
                         TranscriptLine)
from . import analysis, guardrails
from .agora import SILENCE_GOODBYE, AgentHandle, evidence_tool, off_script_tool, rtc_token
from .errors import ServiceError, not_found
from .trial_interviews import available_trial_kinds

log = logging.getLogger(__name__)
MAX_LINES = 600
MAX_ATTEMPTS = 3
STALE_SECONDS = 45
PREPARED_ENTRY_SECONDS = 90
SILENCE_END_SECONDS = 30  # sem resposta desde que a Lia perguntou (o lembrete sai aos 10 s)
OPEN = (InterviewStatus.ready, InterviewStatus.live)


def now() -> datetime:
    return datetime.now(UTC)


@dataclass(frozen=True)
class PreparedEntry:
    credentials: JoinOut
    expires_at: float


class LiveAgents:
    """Handles remotos por entrevista. Um worker; reiniciar a API encerra conversas."""

    def __init__(self):
        self.handles: dict[str, AgentHandle] = {}
        self.prepared: dict[str, PreparedEntry] = {}
        self.seen: dict[str, float] = {}
        # Desde quando a Lia espera resposta. Lembretes de silêncio não reiniciam o relógio.
        self.waiting: dict[str, float | None] = {}
        self.lock = asyncio.Lock()

    def touch(self, interview_id: str) -> None:
        if interview_id in self.handles:
            self.seen[interview_id] = time.monotonic()

    def stale(self) -> list[str]:
        limit = time.monotonic() - STALE_SECONDS
        return [key for key in self.handles if self.seen.get(key, 0) < limit]

    def heard(self, interview_id: str, speaker: str) -> None:
        if interview_id not in self.handles:
            return
        if speaker == "user":
            self.waiting[interview_id] = None
        elif self.waiting.get(interview_id) is None:
            self.waiting[interview_id] = time.monotonic()

    def silent(self) -> list[str]:
        limit = time.monotonic() - SILENCE_END_SECONDS
        return [key for key, since in self.waiting.items() if since is not None and since < limit and key in self.handles]

    async def stop_later(self, interview_id: str, seconds: float) -> None:
        """Desliga depois do aviso falado, mas só o agente daquela tentativa (não uma nova)."""
        handle = self.handles.get(interview_id)

        async def hang_up():
            await asyncio.sleep(seconds)
            if handle is not None and self.handles.get(interview_id) is handle:
                await self.stop(interview_id)
        asyncio.get_running_loop().create_task(hang_up())

    async def stop(self, interview_id: str) -> None:
        self.seen.pop(interview_id, None)
        self.waiting.pop(interview_id, None)
        handle = self.handles.pop(interview_id, None)
        if handle:
            await handle.close()

    async def say(self, interview_id: str, text: str) -> None:
        handle = self.handles.get(interview_id)
        if handle:
            try:
                await asyncio.wait_for(handle.say(text), 8)
            except Exception:
                pass  # a advertência também aparece na tela

    async def stop_all(self) -> None:
        for key in list(self.handles):
            try:
                await self.stop(key)
            except Exception:
                pass


def _attempts(interview: Interview) -> list[dict]:
    return list(interview.attempts or [])


def _close_attempt(interview: Interview, reason: str) -> None:
    attempts = _attempts(interview)
    if attempts and not attempts[-1].get("ended_at"):
        attempts[-1] = {**attempts[-1], "ended_at": now().isoformat(), "end_reason": reason}
        interview.attempts = attempts


def _user_lines(interview: Interview) -> list[str]:
    return [l["text"] for l in (interview.transcript or []) if l["speaker"] == "user"]


class InterviewService:
    def __init__(self, db: Session, settings: Settings, live: LiveAgents):
        self.db, self.settings, self.live = db, settings, live
        self.repo = Interviews(db)

    def own(self, user: User, interview_id: str) -> Interview:
        interview = self.db.get(Interview, interview_id)
        if not interview or interview.user_id != user.id:
            raise not_found("Entrevista")
        return interview

    def mine(self, user: User) -> list[InterviewOut]:
        return [InterviewOut.model_validate(i) for i in self.repo.for_user(user.id)]

    def create(self, user: User, kind: str | None = None) -> InterviewOut:
        users = Users(self.db)
        users.lock_for_interview(user.id)
        for existing in self.repo.for_user(user.id):
            if existing.status in OPEN and (kind is None or (existing.kind or "completa") == kind):
                return InterviewOut.model_validate(existing)
        trial_kind = next((test for test in available_trial_kinds(self.settings, users, user)
                           if kind is None or test == kind), None)
        if trial_kind:
            source_ref = (f"trial:{secrets.token_hex(16)}" if user.id == self.settings.interview_master_user_id
                          else f"trial:{user.id}:{trial_kind}")
            credit = Credit(user_id=user.id, source="trial", source_ref=source_ref, kind=trial_kind)
            self.db.add(credit)
            try:
                self.db.flush()
            except IntegrityError:
                user_id = user.id
                self.db.rollback()
                prior = self.repo.from_credit_source(user_id, "trial", source_ref)
                if prior and prior.status in OPEN:
                    return InterviewOut.model_validate(prior)
                if prior:
                    raise ServiceError(402, "Você já fez este teste gratuito.") from None
                raise
        else:
            credit = users.next_credit(user.id, kind)
            if not credit:
                raise ServiceError(402, "Você não tem entrevistas disponíveis.")
        credit.status = CreditStatus.reserved
        interview = Interview(user_id=user.id, tenant_id=credit.tenant_id, credit_id=credit.id, kind=credit.kind or "completa",
                              share_with_tenant=False, attempts=[], violations=[])
        self.db.add(interview)
        self.db.commit()
        return InterviewOut.model_validate(interview)

    async def restart(self, user: User, interview_id: str) -> InterviewOut:
        if user.id != self.settings.interview_master_user_id:
            raise ServiceError(403, "Sua conta não pode reiniciar entrevistas.")
        source_ref = f"restart:{interview_id}"
        async with self.live.lock:
            source = self.own(user, interview_id)
            replacement = self.repo.from_credit_source(user.id, "restart", source_ref)
            if replacement:
                return InterviewOut.model_validate(replacement)

            kind = source.kind or "completa"
            credit = Credit(user_id=user.id, source="restart", source_ref=source_ref, kind=kind,
                            status=CreditStatus.reserved)
            self.db.add(credit)
            self.db.flush()
            replacement = Interview(user_id=user.id, credit_id=credit.id, kind=kind, share_with_tenant=False)
            self.db.add(replacement)

            if source.status in OPEN:
                _close_attempt(source, "restart")
                source.status, source.ended_at = InterviewStatus.restarted, now()
                source.tool_secret_hash = ""
                self.db.get(Credit, source.credit_id).status = CreditStatus.used
            self.db.commit()
            try:
                await self.live.stop(source.id)
            except Exception:
                log.exception("Falha ao desligar agente de entrevista reiniciada")
            return InterviewOut.model_validate(replacement)

    def state(self, user: User, interview_id: str) -> InterviewState:
        interview = self.own(user, interview_id)
        self.live.touch(interview.id)
        return self._state(interview)

    def _state(self, interview: Interview) -> InterviewState:
        return InterviewState(
            id=interview.id, kind=interview.kind or "completa", status=interview.status.value, attempts=_attempts(interview), max_attempts=MAX_ATTEMPTS,
            violations=[{**v, "label": guardrails.LABELS.get(v["kind"], v["kind"])} for v in (interview.violations or [])],
            max_strikes=guardrails.MAX_STRIKES, live=interview.id in self.live.handles)

    # --- Sala -----------------------------------------------------------------
    def _check_entry(self, interview: Interview) -> None:
        if interview.status not in OPEN:
            raise ServiceError(409, "Esta entrevista já foi encerrada.")
        if not self.settings.agora_ready:
            raise ServiceError(503, "A sala de entrevista ainda não está configurada neste servidor.")

    def _entry_credentials(self, interview_id: str, channel: str) -> JoinOut:
        uid = secrets.randbelow(2**30 - 8) + 1
        return JoinOut(interview_id=interview_id, app_id=self.settings.agora_app_id.get_secret_value(),
                       channel=channel, uid=uid, token=rtc_token(self.settings, channel, uid), agent_uid=uid + 1)

    async def prepare(self, user: User, interview_id: str) -> JoinOut:
        """Autoriza o navegador a publicar o microfone antes de iniciar o agente."""
        async with self.live.lock:
            interview = self.own(user, interview_id)
            self._check_entry(interview)
            channel = f"pf_{interview.id}_{secrets.token_hex(8)}"
            credentials = self._entry_credentials(interview.id, channel)
            self.live.prepared[interview.id] = PreparedEntry(credentials, time.monotonic() + PREPARED_ENTRY_SECONDS)
            return credentials

    async def join(self, user: User, interview_id: str, channel: str | None = None) -> JoinOut:
        async with self.live.lock:
            interview = self.own(user, interview_id)
            self._check_entry(interview)
            if channel is not None:
                prepared = self.live.prepared.get(interview.id)
                if not prepared or prepared.expires_at < time.monotonic() or prepared.credentials.channel != channel:
                    raise ServiceError(409, "A preparação do áudio expirou. Entre de novo na entrevista.")
                self.live.prepared.pop(interview.id, None)
                credentials = prepared.credentials
            else:
                credentials = None
            await self.live.stop(interview.id)
            _close_attempt(interview, "dropped")
            attempts = _attempts(interview)
            if len(attempts) >= MAX_ATTEMPTS:
                self._finalize(interview)
                raise ServiceError(409, "As 3 tentativas foram usadas. Seu perfil foi gerado com o que conversamos.")
            if len(self.live.handles) >= 3:
                raise ServiceError(503, "Todas as salas estão ocupadas agora. Tente de novo em alguns minutos.")
            n = len(attempts) + 1
            credentials = credentials or self._entry_credentials(interview.id, f"pf_{interview.id}_{n}")
            channel = credentials.channel
            tool_secret = new_secret()
            tools = [evidence_tool(self.settings, interview.id, tool_secret),
                     off_script_tool(self.settings, interview.id, tool_secret)] if self.settings.tools_url else None
            context = {"attempt": n, "max_attempts": MAX_ATTEMPTS, "strikes": len(interview.violations or []),
                       "mode": interview.kind or "completa",
                       "recent": [f"{'Pessoa' if l['speaker'] == 'user' else 'Lia'}: {l['text']}"
                                  for l in (interview.transcript or [])[-14:]]}
            handle = AgentHandle()
            try:
                await asyncio.wait_for(handle.start(self.settings, channel=channel, agent_uid=credentials.agent_uid, user_uid=credentials.uid,
                                                    tools=tools, context=context), 30)
            except Exception as exc:
                log.warning("Falha ao iniciar o agente de voz (%s)", type(exc).__name__)
                raise ServiceError(502, "Não foi possível iniciar a Lia. Tente de novo. Esta tentativa não foi contada.") from None
            self.live.handles[interview.id] = handle
            self.live.touch(interview.id)
            self.live.waiting[interview.id] = None  # o relógio começa quando a fala da Lia chega ao navegador
            interview.attempts = [*attempts, {"n": n, "started_at": now().isoformat(), "ended_at": None, "end_reason": None}]
            interview.channel, interview.tool_secret_hash = channel, digest(tool_secret)
            interview.status = InterviewStatus.live
            interview.started_at = interview.started_at or now()
            self.db.commit()
            return credentials

    async def transcript(self, user: User, interview_id: str, lines: list[TranscriptLine],
                         channel: str | None = None) -> InterviewState:
        interview = self.own(user, interview_id)
        if channel is not None and interview.channel != channel:
            return self._state(interview)
        self.live.touch(interview.id)
        if interview.status != InterviewStatus.live:
            return self._state(interview)
        stored = list(interview.transcript or [])
        flagged = []
        for line in lines:
            if len(stored) >= MAX_LINES:
                break
            if not stored or stored[-1] != line.model_dump():
                stored.append(line.model_dump())
                self.live.heard(interview.id, line.speaker)
                if line.speaker == "user" and (kind := guardrails.detect(line.text)):
                    flagged.append((kind, line.text))
        interview.transcript = stored
        self.db.commit()
        for kind, text in flagged:
            await self.strike(interview, kind, text, "server")
        return self._state(interview)

    async def leave(self, user: User, interview_id: str, channel: str | None = None) -> InterviewState:
        """Saída sem concluir: só a tentativa do canal que enviou a saída é encerrada."""
        async with self.live.lock:
            interview = self.own(user, interview_id)
            if channel is not None and interview.channel != channel:
                return self._state(interview)
            await self.live.stop(interview.id)
            self.db.refresh(interview)
            if interview.status == InterviewStatus.live:
                _close_attempt(interview, "left")
                self._after_drop(interview)
            return self._state(interview)

    async def reap(self) -> None:
        cutoff = time.monotonic()
        for interview_id, prepared in list(self.live.prepared.items()):
            if prepared.expires_at < cutoff:
                self.live.prepared.pop(interview_id, None)
        for interview_id in self.live.silent():
            await self.end_for_silence(interview_id)
        for interview_id in self.live.stale():
            await self.live.stop(interview_id)
            interview = self.db.get(Interview, interview_id)
            if interview and interview.status == InterviewStatus.live:
                _close_attempt(interview, "dropped")
                self._after_drop(interview)

    async def end_for_silence(self, interview_id: str) -> None:
        """30 s sem resposta: a Lia avisa, a tentativa fecha como 'silence' e a pessoa pode voltar."""
        self.live.waiting.pop(interview_id, None)
        interview = self.db.get(Interview, interview_id)
        if not interview or interview.status != InterviewStatus.live:
            await self.live.stop(interview_id)
            return
        await self.live.say(interview_id, SILENCE_GOODBYE)
        self.db.refresh(interview)
        if interview.status != InterviewStatus.live:
            return
        _close_attempt(interview, "silence")
        self._after_drop(interview)
        await self.live.stop_later(interview_id, 8)

    def _after_drop(self, interview: Interview) -> None:
        if len(_attempts(interview)) >= MAX_ATTEMPTS:
            self._finalize(interview)
        else:
            interview.status = InterviewStatus.ready
            self.db.commit()

    # --- Ferramentas chamadas pela Agora ---------------------------------------
    def _tool_interview(self, interview_id: str, authorization: str) -> Interview:
        interview = self.db.get(Interview, interview_id)
        supplied = authorization.removeprefix("Bearer ") if authorization else ""
        if not interview or not interview.tool_secret_hash or \
                not secrets.compare_digest(interview.tool_secret_hash, digest(supplied)):
            raise not_found("Entrevista")
        if interview.status != InterviewStatus.live:
            raise ServiceError(409, "A entrevista não está em andamento.")
        return interview

    def record_evidence(self, interview_id: str, authorization: str, data: EvidenceInput) -> dict:
        interview = self._tool_interview(interview_id, authorization)
        if data.theme_id not in analysis.THEMES_BY_ID:
            return {"status": "ignored", "message": "Tema desconhecido."}
        # A transcrição do navegador pode chegar segundos depois: a citação é guardada e
        # só conta quando bate com uma fala da pessoa (ao vivo e no perfil final).
        interview.evidence = [*(interview.evidence or []), data.model_dump()][-200:]
        self.db.commit()
        return {"status": "recorded"}

    async def report_off_script(self, interview_id: str, authorization: str, data: OffScriptInput) -> dict:
        interview = self._tool_interview(interview_id, authorization)
        for _ in range(8):  # espera a transcrição da fala chegar do navegador
            self.db.refresh(interview)
            if analysis.quote_in(data.quote, _user_lines(interview)[-30:]):
                strikes = await self.strike(interview, "desvio", data.quote, "agent")
                return {"status": "recorded", "strikes": strikes, "max": guardrails.MAX_STRIKES,
                        "message": "O sistema já avisou a pessoa. Siga a entrevista normalmente."}
            await asyncio.sleep(.5)
        return {"status": "ignored", "message": "Cite a fala literal da pessoa; sem ela não há advertência."}

    async def strike(self, interview: Interview, kind: str, quote: str, source: str) -> int:
        self.db.refresh(interview)
        violations = list(interview.violations or [])
        if interview.status != InterviewStatus.live:
            return len(violations)
        key = analysis.normalize(quote)
        at = now()
        for v in violations[-5:]:  # mesma fala detectada pelo servidor e pela entrevistadora
            if analysis.normalize(v["quote"]) == key or (
                    (at - datetime.fromisoformat(v["at"])).total_seconds() < 15 and analysis.quote_in(v["quote"], [quote])):
                return len(violations)
        attempt = len(_attempts(interview))
        violations.append({"at": at.isoformat(), "attempt": attempt, "kind": kind, "source": source, "quote": quote[:300]})
        interview.violations = violations
        count = len(violations)
        if count < guardrails.MAX_STRIKES:
            self.db.commit()
            await self.live.say(interview.id, guardrails.WARNING.format(n=count))
            return count
        interview.status = InterviewStatus.cancelled
        interview.ended_at = at
        _close_attempt(interview, "guardrail")
        credit = self.db.get(Credit, interview.credit_id)
        credit.status = CreditStatus.used
        self.db.commit()
        await self.live.say(interview.id, guardrails.CANCEL)
        await self.live.stop_later(interview.id, 9)
        return count

    # --- Conclusão ------------------------------------------------------------
    async def finish(self, user: User, interview_id: str) -> ResultOut:
        interview = self.own(user, interview_id)
        await self.live.stop(interview.id)
        self.db.refresh(interview)
        if interview.status == InterviewStatus.restarted:
            raise ServiceError(409, "Esta entrevista foi reiniciada em outra sessão.")
        if interview.status == InterviewStatus.cancelled:
            raise ServiceError(409, "Esta entrevista foi cancelada após 3 advertências.")
        if interview.status != InterviewStatus.analyzed:
            if not _attempts(interview):
                raise ServiceError(409, "A entrevista ainda não começou.")
            _close_attempt(interview, "completed")
            self._finalize(interview)
        return self.result(user, interview_id)

    def _finalize(self, interview: Interview) -> None:
        spoken = _user_lines(interview)
        key = self.settings.analyst_api_key.get_secret_value()
        proposal, found, alert, method = {}, [], False, "lexical"
        if key and (out := analysis.analyst(interview.transcript or [], key, self.settings.analyst_model)):
            proposal, found, alert = out
            method = "analyst"
        themes = analysis.validate(proposal, spoken)
        if method != "analyst" and interview.evidence:
            proposal = analysis.from_agent(interview.evidence)
            themes, method = analysis.validate(proposal, spoken), "agent"
        if method != "analyst" and not themes:
            proposal, found = analysis.lexical(spoken)
            themes, method = analysis.validate(proposal, spoken), "lexical"
        elif method == "agent":
            found = analysis.lexical(spoken)[1]
        alert = alert or analysis.wellbeing_alert(spoken)
        if not self.repo.result(interview.id):
            self.db.add(Result(
                interview_id=interview.id, method=method,
                themes=[] if alert else [t.model_dump() for t in themes],
                paths=[] if alert else [p.model_dump() for p in analysis.paths(found, spoken)],
                discovering=None if alert else (d.model_dump() if (d := analysis.discovering(themes, proposal)) else None),
                wellbeing_alert=alert, summary=analysis.summary(themes, alert)))
        if alert:
            interview.share_with_tenant = False
        self.db.get(Credit, interview.credit_id).status = CreditStatus.used
        interview.status, interview.ended_at = InterviewStatus.analyzed, interview.ended_at or now()
        self.db.commit()

    def result(self, user: User, interview_id: str) -> ResultOut:
        interview = self.own(user, interview_id)
        result = self.repo.result(interview.id)
        if not result:
            raise not_found("Resultado")
        return ResultOut(interview_id=interview.id, method=result.method, summary=result.summary,
                         themes=[ThemeScore(**t) for t in result.themes], paths=result.paths or [],
                         discovering=result.discovering, wellbeing_alert=bool(result.wellbeing_alert),
                         notice=analysis.NOTICE, created_at=result.created_at)

    def live_evidence(self, user: User, interview_id: str) -> list[dict]:
        interview = self.own(user, interview_id)
        spoken = _user_lines(interview)
        return [{"theme_id": e["theme_id"], "theme": analysis.THEMES_BY_ID[e["theme_id"]].name,
                 "domain": analysis.THEMES_BY_ID[e["theme_id"]].domain, "quote": e["quote"]}
                for e in (interview.evidence or []) if e["theme_id"] in analysis.THEMES_BY_ID and analysis.quote_in(e["quote"], spoken)]

    def share(self, user: User, interview_id: str, value: bool) -> InterviewOut:
        interview = self.own(user, interview_id)
        if not interview.tenant_id:
            raise ServiceError(409, "Entrevistas individuais não são compartilhadas com empresas.")
        result = self.repo.result(interview.id)
        if value and result and result.wellbeing_alert:
            raise ServiceError(409, "Este Mapa fica só com você e não pode ser compartilhado.")
        interview.share_with_tenant = value
        self.db.commit()
        return InterviewOut.model_validate(interview)
