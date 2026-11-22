"""Voz no escritório do MOE pela Agora Conversational AI.

Uma voz por vez, um agente por cena: o SDK da Agora só atualiza token e LLM de um agente em
execução (`UpdateAgentsRequestProperties`), não o TTS. Como cada personagem tem a própria voz,
trocar de cena encerra o agente anterior e inicia o do próximo personagem no mesmo canal.

Papéis:
- Agora: ouve (ASR Deepgram + detecção de fim de fala), transcreve no data stream e fala (TTS).
- Servidor: a mente do personagem (memória entre cenas e aprofundamento) escreve cada fala, que
  o agente diz por `say`. O LLM do agente aponta para `/api/tools/moe/{id}/chat/completions`,
  que nunca responde nada: o personagem não improvisa fora do que o servidor decidiu.
- Navegador: publica o microfone, junta a transcrição final da pessoa e a envia para
  `POST /play/sessions/{id}/answers`, exatamente como a resposta por texto.
"""
import asyncio
import hmac
import json
import logging
import secrets
import time
from dataclasses import dataclass, field

from app.core.config import Settings
from app.services.agora import AgentHandle, rtc_token
from app.services.errors import ServiceError, not_found

from .domain import voice_catalog
from .models import MoeSession
from .prompting import scene_brief

log = logging.getLogger(__name__)
MAX_ROOMS = 3
PREPARED_SECONDS = 90
STALE_SECONDS = 15 * 60
START_TIMEOUT = 30


@dataclass
class Room:
    session_id: str
    channel: str
    uid: int
    agent_uid: int
    secret: str
    scene_id: str | None = None
    handle: AgentHandle | None = None
    live: bool = False
    seen: float = field(default_factory=time.monotonic)


class MoeVoiceRooms:
    """Salas por sessão do MOE, na memória do único worker da API (como as da Lia)."""

    def __init__(self):
        self.rooms: dict[str, Room] = {}
        self.lock = asyncio.Lock()

    def live_count(self) -> int:
        return sum(1 for r in self.rooms.values() if r.live)

    async def close(self, session_id: str) -> None:
        room = self.rooms.pop(session_id, None)
        if room and room.handle:
            try:
                await room.handle.close()
            except Exception:
                log.warning("Falha ao encerrar o agente de voz do MOE")

    async def reap(self) -> None:
        now = time.monotonic()
        for sid, room in list(self.rooms.items()):
            if (not room.live and now - room.seen > PREPARED_SECONDS) or now - room.seen > STALE_SECONDS:
                await self.close(sid)

    async def stop_all(self) -> None:
        for sid in list(self.rooms):
            await self.close(sid)

    def check_secret(self, session_id: str, authorization: str) -> bool:
        room = self.rooms.get(session_id)
        token = authorization.removeprefix("Bearer ").strip()
        return bool(room and token and hmac.compare_digest(room.secret, token))


def available(settings: Settings) -> str | None:
    """Motivo de a voz estar indisponível, ou None quando dá para falar."""
    if not settings.agora_ready:
        return "A voz dos personagens ainda não está configurada neste servidor. Continue por texto."
    if not settings.tools_url:
        return "A voz dos personagens precisa do endereço público da API (PF_TOOLS_URL). Continue por texto."
    return None


def _current_line(s: MoeSession) -> tuple[dict, str] | None:
    """Cena e fala do personagem que espera resposta (a última fala do personagem no diálogo)."""
    from .service import _pending
    pending = _pending(s)
    if not pending or s.status != "playing":
        return None
    scene, turn = pending
    for d in reversed(s.dialogue or []):
        if d["speaker"] == "npc" and d["scene_id"] == scene["id"] and d["turn"] == turn:
            return scene, d["text"]
    return scene, scene["line"]


def _brief(settings: Settings, s: MoeSession, scene: dict) -> dict:
    brief = scene_brief(s.snapshot, scene["id"])
    # Só ids do catálogo configurado; fora dele vale a voz padrão do servidor.
    known = {v["id"] for v in voice_catalog(settings.tts_vendor, settings.tts_voice)["voices"]}
    if brief["voice"]["voice_id"] not in known:
        brief["voice"]["voice_id"] = None
    return brief


def _status(room: Room | None, settings: Settings, reason: str | None = None) -> dict:
    if room is None or not room.live:
        return {"live": False, "reason": reason or available(settings)}
    return {"live": True, "channel": room.channel, "agent_uid": room.agent_uid, "scene_id": room.scene_id, "reason": None}


class MoeVoice:
    def __init__(self, settings: Settings, rooms: MoeVoiceRooms):
        self.settings, self.rooms = settings, rooms

    def _llm_url(self, session_id: str) -> str:
        return f"{self.settings.tools_url}/api/tools/moe/{session_id}/chat/completions"

    async def _start(self, room: Room, s: MoeSession, scene: dict, line: str) -> None:
        brief = _brief(self.settings, s, scene)
        handle = AgentHandle()
        await asyncio.wait_for(handle.start_npc(self.settings, channel=room.channel, agent_uid=room.agent_uid,
                                                user_uid=room.uid, brief=brief, greeting=line,
                                                llm_url=self._llm_url(s.id), secret=room.secret), START_TIMEOUT)
        room.handle, room.scene_id, room.live = handle, scene["id"], True

    def status(self, session_id: str) -> dict:
        return _status(self.rooms.rooms.get(session_id), self.settings)

    async def prepare(self, s: MoeSession) -> dict:
        """Credenciais para o navegador publicar o microfone antes de o personagem entrar."""
        if reason := available(self.settings):
            raise ServiceError(503, reason)
        if not _current_line(s):
            raise ServiceError(409, "Não há fala esperando resposta nesta simulação.")
        async with self.rooms.lock:
            await self.rooms.close(s.id)
            uid = secrets.randbelow(2**30 - 64) + 1
            channel = f"moe_{s.id[:12]}_{secrets.token_hex(6)}"
            room = Room(session_id=s.id, channel=channel, uid=uid, agent_uid=uid + 1, secret=secrets.token_urlsafe(32))
            self.rooms.rooms[s.id] = room
        return {"app_id": self.settings.agora_app_id.get_secret_value(), "channel": channel, "uid": uid,
                "token": rtc_token(self.settings, channel, uid), "agent_uid": room.agent_uid}

    async def join(self, s: MoeSession, channel: str) -> dict:
        """Chama o personagem da cena atual; ele abre com a fala já escrita pelo servidor."""
        async with self.rooms.lock:
            room = self.rooms.rooms.get(s.id)
            if not room or room.channel != channel or room.live:
                raise ServiceError(409, "A preparação do áudio expirou. Ative a voz de novo.")
            if time.monotonic() - room.seen > PREPARED_SECONDS:
                await self.rooms.close(s.id)
                raise ServiceError(409, "A preparação do áudio expirou. Ative a voz de novo.")
            if self.rooms.live_count() >= MAX_ROOMS:
                raise ServiceError(503, "As salas de voz estão ocupadas agora. Continue por texto ou tente em alguns minutos.")
            current = _current_line(s)
            if not current:
                raise ServiceError(409, "Não há fala esperando resposta nesta simulação.")
            try:
                await self._start(room, s, *current)
            except Exception as exc:
                log.warning("Falha ao iniciar o personagem por voz (%s)", type(exc).__name__)
                await self.rooms.close(s.id)
                raise ServiceError(502, "Não foi possível chamar o personagem por voz. Continue por texto.") from None
            room.seen = time.monotonic()
            return _status(room, self.settings)

    async def after_answer(self, s: MoeSession) -> dict | None:
        """Depois da resposta registrada: o mesmo personagem aprofunda, ou o próximo entra com a própria voz."""
        room = self.rooms.rooms.get(s.id)
        if not room or not room.live:
            return None
        room.seen = time.monotonic()
        current = _current_line(s)
        if current is None:  # última resposta: o escritório se despede pela tela
            await self.rooms.close(s.id)
            return {"live": False, "reason": None, "ended": True}
        scene, line = current
        try:
            if scene["id"] == room.scene_id and room.handle:
                await asyncio.wait_for(room.handle.say(line), 10)
                return _status(room, self.settings)
            old, room.handle, room.live = room.handle, None, False
            if old:
                await old.close()
            room.agent_uid += 1  # novo agente, novo uid: o navegador assina quem publicar áudio
            await self._start(room, s, scene, line)
            return _status(room, self.settings)
        except Exception as exc:
            log.warning("Falha ao passar a fala para o personagem por voz (%s)", type(exc).__name__)
            await self.rooms.close(s.id)
            return {"live": False, "reason": "A voz caiu. A conversa continua por texto, do mesmo ponto."}

    async def leave(self, session_id: str, channel: str | None) -> dict:
        room = self.rooms.rooms.get(session_id)
        if room and (channel is None or room.channel == channel):
            await self.rooms.close(session_id)
        return self.status(session_id)


def silent_completion(body: bytes) -> tuple[str, str]:
    """Resposta do 'LLM' do agente: vazia. Quem fala é a mente do personagem, por `say`."""
    try:
        stream = bool(json.loads(body or b"{}").get("stream"))
    except (ValueError, AttributeError):
        stream = False
    created = int(time.time())
    if not stream:
        return "application/json", json.dumps({
            "id": "moe-listen", "object": "chat.completion", "created": created, "model": "moe-mind",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": ""}, "finish_reason": "stop"}]})
    chunk = {"id": "moe-listen", "object": "chat.completion.chunk", "created": created, "model": "moe-mind",
             "choices": [{"index": 0, "delta": {"role": "assistant", "content": ""}, "finish_reason": "stop"}]}
    return "text/event-stream", f"data: {json.dumps(chunk)}\n\ndata: [DONE]\n\n"


def require_room(rooms: MoeVoiceRooms, session_id: str, authorization: str) -> None:
    if not rooms.check_secret(session_id, authorization):
        raise not_found("Sessão")
