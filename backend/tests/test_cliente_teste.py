"""Cliente teste: vaga de Product Manager jogada no escritório, com personagens que lembram e reagem."""
from app.seed_cliente_teste import CANDIDATE, SENHA, seed
from app.services import analysis
from test_flows import ORIGIN, app  # noqa: F401  fixture reutilizada
from fastapi.testclient import TestClient

M = "/api/v1/moe"
ANSWERS = [
    "Quero trazer o problema do cliente: ele tem contrato grande e pode perder a renovação sem cobrança recorrente.",
    "Proponho um MVP só com cartão e plano mensal, o resto fica de fora, e quero a estimativa de vocês antes de prometer data.",
    "Para a primeira versão o critério de aceite é cobrar todo mês no cartão e avisar o cliente quando o cartão for recusado.",
    "Usamos o gateway que já temos e fazemos a retentativa em três dias.",
    "Meu plano é adiar a migração do banco para a próxima sprint e entregar o MVP em duas semanas.",
    "O maior risco é a integração atrasar; o plano B é liberar só para esse cliente e eu atualizo o status toda terça.",
    "Recomendo fazer: esse cliente representa 8 por cento da receita e o risco de churn é alto.",
    "Vamos medir a taxa de cobranças aprovadas e a renovação do contrato no próximo mês.",
]


def login(app, email):
    c = TestClient(app, headers=ORIGIN)
    assert c.post("/api/v1/auth/login", json={"email": email, "password": SENHA}).status_code == 200
    return c


def test_pm_job_simulation_with_memory_reactions_and_fit(app):
    with app.state.db.sessions() as db:
        out = seed(db, app.state.settings)
    admin = login(app, out["admin"])
    jobs = admin.get("/api/v1/tenant/jobs").json()
    assert len(jobs) == 1 and jobs[0]["assessment"] == "simulacao" and jobs[0]["scenario_title"] == out["scenario"]
    assert {h["name"] for h in jobs[0]["hard_skills"]} >= {"Priorização de roadmap", "Métricas de produto"}

    person = login(app, CANDIDATE[1])
    available = person.get(f"{M}/play/scenarios").json()
    assert available[0]["job_title"].startswith("Product Manager")
    assert available[0]["stages"] == ["Time de desenvolvimento", "Gerência", "Diretoria"]
    s = person.post(f"{M}/play/sessions", json={"scenario_id": available[0]["id"]}).json()
    assert s["total_turns"] == 8 and s["current"] == {"scene_id": "time-devs", "turn": 0}
    assert person.post(f"{M}/play/sessions", json={"scenario_id": available[0]["id"]}).json()["id"] == s["id"]

    for text in ANSWERS:
        cur = s["current"]
        s = person.post(f"{M}/play/sessions/{s['id']}/answers", json={**cur, "text": text}).json()
    lines = {(t["scene_id"], t["turn"]): t for t in s["turns"]}
    # O tech lead reage ao que foi coberto e aprofunda o que faltou (escopo mínimo).
    assert lines[("time-devs", 1)]["source"] == "mente" and "primeira versão" in lines[("time-devs", 1)]["line"]
    # A gerência abre lembrando o que a pessoa disse ao time de devs.
    opening = lines[("gerencia", 0)]
    assert opening["source"] == "memoria" and "me contou que você disse" in opening["line"]
    assert s["current"] is None

    done = person.post(f"{M}/play/sessions/{s['id']}/finish").json()
    fit = done["analysis"]["fit"]
    assert done["share_with_tenant"] is True and fit["hard_skills"] > 0
    refl = fit["reflections"]
    assert [r["persona"] for r in refl] == ["Rafa", "Rafa", "Júlia", "Júlia", "Marcos", "Marcos", "Helena", "Helena"]
    assert {r["stage"] for r in refl} == {"Time de desenvolvimento", "Gerência", "Diretoria"}
    helena = refl[7]
    assert any(x["label"] == "Métricas de produto" for x in helena["reflects"]) and helena["note"].startswith("Mostra")
    quotes = [e["quote"] for e in fit["hard_detail"] + fit["skills_detail"] + fit["culture_detail"] if e["quote"]]
    assert quotes and all(analysis.quote_in(q, ANSWERS) for q in quotes)

    ranking = admin.get(f"/api/v1/tenant/jobs/{jobs[0]['id']}").json()
    row = ranking["candidates"][0]
    assert row["stage"] == "analyzed" and row["fit"]["reflections"][4]["persona"] == "Marcos"
    # Retirar a autorização tira a análise da empresa.
    person.post(f"{M}/play/sessions/{s['id']}/share", json={"share": False})
    assert admin.get(f"/api/v1/tenant/jobs/{jobs[0]['id']}").json()["candidates"][0]["fit"] is None
