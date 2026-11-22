"""MOE: a empresa configura pontos, personagens e cenários; a pessoa joga; a empresa só vê com consentimento."""
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.moe import analysis as moe_analysis
from app.moe.prompting import scene_brief

PW = "senha-forte-123"
ORIGIN = {"origin": "http://localhost:3000"}
M = "/api/v1/moe"


def make_app(tmp_path, **extra):
    settings = Settings(PF_ENV="test", PF_DATABASE_URL=f"sqlite:///{tmp_path}/t.db", PF_PUBLIC_URL="http://localhost:3000",
                        AGORA_APP_ID="", AGORA_APP_CERTIFICATE="", STRIPE_SECRET_KEY="", ANALYST_LLM_API_KEY="",
                        _env_file=None, **extra)
    return create_app(settings)


@pytest.fixture
def app(tmp_path):
    return make_app(tmp_path)


def company(app, email="rui@acme.com", name="Acme"):
    admin = TestClient(app, headers=ORIGIN)
    admin.post("/api/v1/auth/company/signup", json={"name": "Rui", "email": email, "password": PW, "company": name})
    return admin


def member(app, admin, email="bia@acme.com"):
    token = admin.post("/api/v1/tenant/invites", json={"email": email}).json()["link"].rsplit("/", 1)[1]
    person = TestClient(app, headers=ORIGIN)
    assert person.post("/api/v1/auth/invites/accept", json={"token": token, "name": "Bia", "password": PW}).status_code < 300
    return person


def published_s01(admin):
    sc = admin.post(f"{M}/scenarios/from-template").json()
    assert admin.post(f"{M}/scenarios/{sc['id']}/publish").status_code == 200
    return sc


ANSWERS = ["Primeiro separo o que vence hoje e pergunto à gestora o que é inegociável.",
           "Pergunto onde você travou e dividimos a parte mais urgente entre nós.",
           "Já entregamos o módulo A, o risco é o B atrasar e o próximo passo é revisar às 16h."]


def play(person, scenario_id, answers=ANSWERS):
    s = person.post(f"{M}/play/sessions", json={"scenario_id": scenario_id}).json()
    for scene, text in zip(s["scenes"], answers):
        r = person.post(f"{M}/play/sessions/{s['id']}/answers", json={"scene_id": scene["id"], "text": text})
        assert r.status_code == 200, r.text
    return person.post(f"{M}/play/sessions/{s['id']}/finish").json()


def test_template_creates_editable_points_personas_and_scenario(app):
    admin = company(app)
    sc = admin.post(f"{M}/scenarios/from-template").json()
    assert [s["id"] for s in sc["scenes"]] == ["briefing", "colega", "atualizacao"]
    assert sc["cast_size"] == 3 and sc["status"] == "draft"
    points = admin.get(f"{M}/points").json()
    assert [p["name"] for p in points] == ["Priorização", "Colaboração", "Comunicação de status"]  # ordem por peso
    personas = {p["name"]: p for p in admin.get(f"{M}/personas").json()}
    assert personas["Léo"]["stance"] == "colaborativa" and personas["Nara"]["voice_tone"] == "objetiva"
    assert all(p["in_use"] for p in personas.values())
    # Rodar de novo reaproveita pontos e personagens pelo nome.
    admin.post(f"{M}/scenarios/from-template")
    assert len(admin.get(f"{M}/points").json()) == 3 and len(admin.get(f"{M}/personas").json()) == 3


def test_flex_weight_pressure_tone_and_lines(app):
    admin = company(app)
    sc = admin.post(f"{M}/scenarios/from-template").json()
    point = admin.get(f"{M}/points").json()[1]
    r = admin.put(f"{M}/points/{point['id']}", json={**{k: point[k] for k in ("name", "description", "signals")}, "weight": 5})
    assert r.json()["weight"] == 5
    body = {"title": sc["title"], "description": sc["description"], "pressure": 5, "tone": "tenso",
            "point_ids": sc["point_ids"], "scenes": [{**s, "line": s["line"] + " Temos só uma hora."} for s in sc["scenes"]][::-1]}
    up = admin.put(f"{M}/scenarios/{sc['id']}", json=body).json()
    assert up["pressure"] == 5 and up["tone"] == "tenso"
    assert [s["id"] for s in up["scenes"]] == ["atualizacao", "colega", "briefing"]
    assert up["scenes"][0]["line"].endswith("Temos só uma hora.")


def test_participant_plays_and_sees_point_reading_without_score(app):
    admin = company(app)
    person = member(app, admin)
    sc = published_s01(admin)
    assert [s["id"] for s in person.get(f"{M}/play/scenarios").json()] == [sc["id"]]
    started = person.post(f"{M}/play/sessions", json={"scenario_id": sc["id"]}).json()
    assert {c["name"] for c in started["cast"]} == {"Maia", "Léo", "Nara"}
    assert "points" not in started and started["analysis"] is None  # pontos ficam ocultos durante o jogo
    # Fora de ordem não avança.
    r = person.post(f"{M}/play/sessions/{started['id']}/answers", json={"scene_id": "atualizacao", "text": "oi"})
    assert r.status_code == 409
    done = play(person, sc["id"])
    mine = person.get(f"{M}/play/sessions").json()
    assert [(x["id"], x["status"], x["answered"]) for x in mine] == [(done["id"], "finished", 3), (started["id"], "playing", 0)]
    a = done["analysis"]
    assert done["status"] == "finished" and a["method"] == "mapeamento"
    assert [p["name"] for p in a["points"]] == ["Priorização", "Colaboração", "Comunicação de status"]
    assert a["points"][0]["quotes"] == [ANSWERS[0]]
    flat = str(a)
    assert "score" not in flat and "nota" not in [k for p in a["points"] for k in p]
    assert "Temos uma entrega hoje" not in str(a["points"])  # fala de personagem nunca vira evidência
    # A conversa fica registrada à parte: o que cada personagem disse e o que a resposta tocou.
    conv = a["conversations"]
    assert [c["persona"] for c in conv] == ["Maia", "Léo", "Nara"] and conv[0]["npc_line"].startswith("Temos uma entrega hoje")
    assert conv[0]["quote"] == ANSWERS[0] and conv[0]["points"] == ["Priorização"]
    assert "simulação fictícia" in a["notice"]


def test_company_sees_results_only_with_consent(app):
    admin = company(app)
    person = member(app, admin)
    sc = published_s01(admin)
    done = play(person, sc["id"])
    assert admin.get(f"{M}/results").json() == []
    person.post(f"{M}/play/sessions/{done['id']}/share", json={"share": True})
    rows = admin.get(f"{M}/results").json()
    assert len(rows) == 1 and rows[0]["person"] == "Bia" and rows[0]["answers"][1]["quote"] == ANSWERS[1]
    person.post(f"{M}/play/sessions/{done['id']}/share", json={"share": False})
    assert admin.get(f"{M}/results").json() == []


def test_roles_and_tenant_isolation(app):
    admin = company(app)
    person = member(app, admin)
    sc = published_s01(admin)
    assert person.get(f"{M}/points").status_code == 403
    assert person.post(f"{M}/scenarios/from-template").status_code == 403
    other = company(app, "ana@beta.com", "Beta")
    assert other.get(f"{M}/scenarios/{sc['id']}").status_code == 404
    assert other.post(f"{M}/play/sessions", json={"scenario_id": sc["id"]}).status_code == 404
    done = play(person, sc["id"])
    assert other.get(f"{M}/play/sessions/{done['id']}").status_code == 404
    assert admin.get(f"{M}/play/sessions/{done['id']}").status_code == 404  # nem a própria empresa abre a sessão


def test_sensitive_topics_are_rejected_without_false_positives(app):
    admin = company(app)
    r = admin.post(f"{M}/points", json={"name": "Disponibilidade", "description": "Mesmo tendo filhos pequenos", "weight": 3})
    assert r.status_code == 422 and "filhos" in r.json()["detail"]
    ok = admin.post(f"{M}/points", json={"name": "Capacidade de adaptação", "description": "Atividade com prioridade", "weight": 2})
    assert ok.status_code == 201
    assert admin.post(f"{M}/personas", json={"name": "Ivo", "role": "Colega", "speaking_style": "Pergunta sobre religião"}).status_code == 422


def test_voice_must_come_from_configured_catalog(tmp_path):
    app = make_app(tmp_path, TTS_VENDOR="openai")
    admin = company(app)
    cat = admin.get(f"{M}/catalog").json()
    assert {v["id"] for v in cat["voices"]["voices"]} == {"alloy", "echo", "fable", "onyx", "nova", "shimmer"}
    bad = admin.post(f"{M}/personas", json={"name": "Ivo", "role": "Colega", "voice_id": "voz-inventada"})
    assert bad.status_code == 422
    good = admin.post(f"{M}/personas", json={"name": "Ivo", "role": "Colega", "voice_id": "nova", "voice_tone": "firme"}).json()
    assert good["voice_verified"] is True


def test_in_use_items_cannot_be_deleted_and_cast_is_limited(app):
    admin = company(app)
    sc = admin.post(f"{M}/scenarios/from-template").json()
    persona_id = sc["scenes"][0]["persona_id"]
    assert admin.delete(f"{M}/personas/{persona_id}").status_code == 409
    assert admin.delete(f"{M}/points/{sc['point_ids'][0]}").status_code == 409
    extra = [admin.post(f"{M}/personas", json={"name": f"Extra {i}", "role": "Colega"}).json()["id"] for i in range(2)]
    scenes = [{"persona_id": p, "line": "Como você lidaria com isso agora?"} for p in
              [s["persona_id"] for s in sc["scenes"]] + extra]
    r = admin.put(f"{M}/scenarios/{sc['id']}", json={"title": "Grande", "point_ids": sc["point_ids"], "scenes": scenes})
    assert r.status_code == 422


def test_published_snapshot_is_frozen_until_republish(app):
    admin = company(app)
    person = member(app, admin)
    sc = published_s01(admin)
    s = person.post(f"{M}/play/sessions", json={"scenario_id": sc["id"]}).json()
    body = {"title": "Entrega sob pressão (v2)", "pressure": 4, "tone": "tenso", "point_ids": sc["point_ids"],
            "scenes": [{k: x[k] for k in ("id", "persona_id", "line", "point_ids")} for x in sc["scenes"]]}
    up = admin.put(f"{M}/scenarios/{sc['id']}", json=body).json()
    assert up["dirty"] is True and up["version"] == 1
    assert person.get(f"{M}/play/sessions/{s['id']}").json()["title"] == "Entrega sob pressão"
    assert admin.post(f"{M}/scenarios/{sc['id']}/publish").json()["version"] == 2


def test_llm_proposals_keep_only_literal_quotes_and_catalog_signals(app, monkeypatch):
    admin = company(app)
    person = member(app, admin)
    sc = published_s01(admin)
    points = {p["name"]: p for p in admin.get(f"{M}/points").json()}
    prio = points["Priorização"]

    def fake_llm(snapshot, answers, api_key, model):
        return [{"point_id": prio["id"], "signals": ["Separa o urgente do importante", "Sinal inventado"],
                 "quotes": ["separo o que vence hoje", "Eu sempre fui líder nato"], "note": "Separou o que vence hoje."}]
    monkeypatch.setattr(moe_analysis, "llm", fake_llm)
    app.state.settings.analyst_api_key = type(app.state.settings.analyst_api_key)("sk-teste")
    a = play(person, sc["id"])["analysis"]
    assert a["method"] == "llm"
    p = next(x for x in a["points"] if x["point_id"] == prio["id"])
    assert p["quotes"] == ["separo o que vence hoje"] and p["signals"] == ["Separa o urgente do importante"]
    others = [x for x in a["points"] if x["point_id"] != prio["id"]]
    assert all(x["quotes"] == [] and x["signals"] == [] for x in others)


def test_wellbeing_alert_hides_reading_and_blocks_sharing(app):
    admin = company(app)
    person = member(app, admin)
    sc = published_s01(admin)
    done = play(person, sc["id"], [ANSWERS[0], "Sinceramente não aguento mais viver assim.", ANSWERS[2]])
    assert done["wellbeing_alert"] is True and done["analysis"] is None
    assert person.post(f"{M}/play/sessions/{done['id']}/share", json={"share": True}).status_code == 409


def test_scene_brief_gives_persona_and_voice_but_never_the_points(app):
    admin = company(app)
    sc = published_s01(admin)
    snap = app.state.db.sessions().get(__import__("app.moe.models", fromlist=["MoeScenario"]).MoeScenario, sc["id"]).published
    brief = scene_brief(snap, "colega")
    assert brief["persona"]["name"] == "Léo" and brief["voice"]["tone"] == "dinamica"
    assert "Estou com uma tarefa atrasada" in brief["greeting"]
    prompt = brief["system_prompt"]
    assert "Você é Léo, Colega" in prompt and "Não avalie" in prompt and "CVV 188" in prompt
    assert all(p["name"] not in prompt for p in snap["points"].values())
