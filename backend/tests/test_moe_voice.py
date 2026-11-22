"""Voz no escritório do MOE: um agente Agora por cena, falas da mente do servidor, texto como reserva."""
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.moe import voice
from app.seed_cliente_teste import CANDIDATE, SENHA, seed
from test_cliente_teste import ANSWERS
from test_flows import ORIGIN

M = "/api/v1/moe"


class FakeNpc:
    """Agente de voz falso: guarda o que cada personagem disse e quando foi encerrado."""
    started: list["FakeNpc"] = []

    def __init__(self):
        self.said: list[str] = []
        self.closed = False
        self.kw: dict = {}

    async def start_npc(self, settings, **kw):
        self.kw = kw
        FakeNpc.started.append(self)

    async def say(self, text):
        self.said.append(text)

    async def close(self):
        self.closed = True


def _settings(tmp_path, **extra):
    return Settings(PF_ENV="test", PF_DATABASE_URL=f"sqlite:///{tmp_path}/t.db", PF_PUBLIC_URL="http://localhost:3000",
                    STRIPE_SECRET_KEY="", ANALYST_LLM_API_KEY="", _env_file=None, **extra)


@pytest.fixture
def voice_app(tmp_path, monkeypatch):
    monkeypatch.setattr(voice, "AgentHandle", FakeNpc)
    FakeNpc.started = []
    return create_app(_settings(tmp_path, AGORA_APP_ID="a" * 32, AGORA_APP_CERTIFICATE="b" * 32,
                                PF_TOOLS_URL="https://example.com"))


def _player(app):
    with app.state.db.sessions() as db:
        seed(db, app.state.settings)
    c = TestClient(app, headers=ORIGIN)
    assert c.post("/api/v1/auth/login", json={"email": CANDIDATE[1], "password": SENHA}).status_code == 200
    scenario = c.get(f"{M}/play/scenarios").json()[0]["id"]
    return c, c.post(f"{M}/play/sessions", json={"scenario_id": scenario}).json()


def _enter(c, sid):
    creds = c.post(f"{M}/play/sessions/{sid}/voice/prepare").json()
    assert creds["app_id"] == "a" * 32 and creds["token"] and creds["agent_uid"] == creds["uid"] + 1
    joined = c.post(f"{M}/play/sessions/{sid}/voice/join", params={"channel": creds["channel"]}).json()
    return creds, joined


def test_voice_scene_by_scene_with_memory_and_persona_voice(voice_app):
    c, s = _player(voice_app)
    sid = s["id"]
    creds, joined = _enter(c, sid)
    assert joined["live"] and joined["scene_id"] == "time-devs" and joined["agent_uid"] == creds["agent_uid"]
    rafa = FakeNpc.started[0]
    assert rafa.kw["greeting"] == s["turns"][0]["line"] and rafa.kw["user_uid"] == creds["uid"]
    assert rafa.kw["llm_url"] == f"https://example.com/api/tools/moe/{sid}/chat/completions"
    assert "Rafa" in rafa.kw["brief"]["system_prompt"]
    assert rafa.kw["brief"]["voice"]["voice_id"] in (None, "Portuguese_SentimentalLady")

    # Mesma cena: o personagem aprofunda com a fala que a mente escreveu, pela mesma voz.
    s = c.post(f"{M}/play/sessions/{sid}/answers", json={**s["current"], "text": ANSWERS[0]}).json()
    assert s["current"] == {"scene_id": "time-devs", "turn": 1} and s["voice"]["live"]
    assert rafa.said == [s["turns"][-1]["line"]] and s["turns"][-1]["source"] == "mente"

    # Próxima cena: o agente do Rafa sai e o da Júlia entra no mesmo canal, abrindo com memória.
    s = c.post(f"{M}/play/sessions/{sid}/answers", json={**s["current"], "text": ANSWERS[1]}).json()
    julia = FakeNpc.started[1]
    assert rafa.closed and not julia.closed and julia.kw["channel"] == creds["channel"]
    assert s["voice"] == {"live": True, "channel": creds["channel"], "agent_uid": creds["agent_uid"] + 1,
                          "scene_id": "dev-backend", "reason": None}
    assert julia.kw["greeting"] == s["turns"][-1]["line"] and "Júlia" in julia.kw["brief"]["system_prompt"]

    for text in ANSWERS[2:]:
        s = c.post(f"{M}/play/sessions/{sid}/answers", json={**s["current"], "text": text}).json()
    assert s["current"] is None and s["voice"] == {"live": False, "reason": None, "ended": True}
    assert len(FakeNpc.started) == 4 and all(a.closed for a in FakeNpc.started)
    assert c.post(f"{M}/play/sessions/{sid}/finish").json()["status"] == "finished"


def test_agent_llm_endpoint_stays_silent_and_needs_room_secret(voice_app):
    c, s = _player(voice_app)
    sid = s["id"]
    _enter(c, sid)
    secret = voice_app.state.moe_voice.rooms[sid].secret
    tool = TestClient(voice_app)
    url = f"/api/tools/moe/{sid}/chat/completions"
    assert tool.post(url, json={"messages": []}).status_code == 404
    assert tool.post(url, json={"messages": []}, headers={"Authorization": "Bearer errado"}).status_code == 404
    r = tool.post(url, json={"stream": True, "messages": [{"role": "user", "content": "oi"}]},
                  headers={"Authorization": f"Bearer {secret}"})
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/event-stream")
    assert '"content": ""' in r.text and r.text.rstrip().endswith("data: [DONE]")
    r = tool.post(url, json={"messages": []}, headers={"Authorization": f"Bearer {secret}"})
    assert r.json()["choices"][0]["message"]["content"] == ""


def test_join_needs_the_prepared_channel_and_leave_closes_agent(voice_app):
    c, s = _player(voice_app)
    sid = s["id"]
    creds = c.post(f"{M}/play/sessions/{sid}/voice/prepare").json()
    assert c.post(f"{M}/play/sessions/{sid}/voice/join", params={"channel": "outro"}).status_code == 409
    assert c.post(f"{M}/play/sessions/{sid}/voice/join", params={"channel": creds["channel"]}).json()["live"]
    assert c.get(f"{M}/play/sessions/{sid}/voice").json()["live"]
    assert c.post(f"{M}/play/sessions/{sid}/voice/leave", params={"channel": "outro"}).json()["live"]
    assert c.post(f"{M}/play/sessions/{sid}/voice/leave", params={"channel": creds["channel"]}).json()["live"] is False
    assert FakeNpc.started[0].closed
    # Sem voz, a resposta por texto segue igual e não carrega estado de voz.
    s = c.post(f"{M}/play/sessions/{sid}/answers", json={**s["current"], "text": ANSWERS[0]}).json()
    assert "voice" not in s and s["current"]["turn"] == 1


def test_other_person_cannot_use_the_voice_room(voice_app):
    c, s = _player(voice_app)
    other = TestClient(voice_app, headers=ORIGIN)
    r = other.post("/api/v1/auth/company/signup", json={"name": "Eva", "email": "eva@outra.com", "password": SENHA, "company": "Outra"})
    assert r.status_code in (200, 201), r.text
    assert other.post(f"{M}/play/sessions/{s['id']}/voice/prepare").status_code in (403, 404)


def test_agent_failure_falls_back_to_text(voice_app, monkeypatch):
    async def broken(self, settings, **kw):
        raise RuntimeError("agora fora")
    monkeypatch.setattr(FakeNpc, "start_npc", broken)
    c, s = _player(voice_app)
    creds = c.post(f"{M}/play/sessions/{s['id']}/voice/prepare").json()
    r = c.post(f"{M}/play/sessions/{s['id']}/voice/join", params={"channel": creds["channel"]})
    assert r.status_code == 502 and "texto" in r.json()["detail"]
    assert c.post(f"{M}/play/sessions/{s['id']}/answers", json={**s["current"], "text": ANSWERS[0]}).status_code == 200


def test_without_agora_voice_is_unavailable_and_text_still_works(tmp_path):
    app = create_app(_settings(tmp_path))
    c, s = _player(app)
    status = c.get(f"{M}/play/sessions/{s['id']}/voice").json()
    assert status["live"] is False and "texto" in status["reason"]
    r = c.post(f"{M}/play/sessions/{s['id']}/voice/prepare")
    assert r.status_code == 503 and "texto" in r.json()["detail"]
    s = c.post(f"{M}/play/sessions/{s['id']}/answers", json={**s["current"], "text": ANSWERS[0]}).json()
    assert "voice" not in s and s["current"] == {"scene_id": "time-devs", "turn": 1}
