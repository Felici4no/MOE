"""Cultura, vagas, convites em lote por planilha e ranking de fit."""
import base64
import io
import zipfile

from openpyxl import Workbook

from app.services import analysis
from test_flows import PW, FakeAgent, app, client  # noqa: F401  fixture reutilizada

CULTURE = ("Aqui o cliente está no centro de tudo. Trabalhamos em colaboração, o time decide junto, "
           "e cada pessoa tem autonomia e responsabilidade para agir como dona do que faz.")
LINES = ["Eu liguei para cada cliente que cancelou para entender o motivo e expliquei o plano novo.",
         "A gente dividiu a carteira e eu ajudei o colega que estava atrasado.",
         "Ninguém pediu, mas eu tomei a iniciativa de montar uma planilha de prioridade.",
         "Quando o sistema caiu eu me adaptei e atendi pelo telefone mesmo assim.",
         "Percebi que o preço estava errado e avisei antes de dar prejuízo."]


def b64(data: bytes, name: str) -> dict:
    return {"filename": name, "content_base64": base64.b64encode(data).decode()}


def xlsx(rows: list[list[str]]) -> bytes:
    book = Workbook()
    for row in rows:
        book.active.append(row)
    out = io.BytesIO()
    book.save(out)
    return out.getvalue()


def company(app):
    admin = client(app)
    admin.post("/api/v1/auth/company/signup", json={"name": "Rui", "email": "rui@acme.com", "password": PW, "company": "Acme"})
    return admin


def job(admin, **extra) -> str:
    body = {"title": "Analista de Customer Success", "description": "Atendimento e retenção de clientes.",
            "soft_skills": [{"id": "comunicacao", "name": "Comunicação"},
                            {"id": "foco-cliente", "name": "Foco no cliente"},
                            {"id": "negociacao", "name": "Negociação", "level": "desejavel"}],
            "profile": {"fazer": 60, "gente": 80, "pensar": 50, "forca": 50}, **extra}
    r = admin.post("/api/v1/tenant/jobs", json=body)
    assert r.status_code == 201
    return r.json()["id"]


def test_culture_text_file_and_manual_values(app):
    admin = company(app)
    assert admin.get("/api/v1/tenant/culture").json()["values"] == []
    out = admin.put("/api/v1/tenant/culture", json={"text": CULTURE}).json()
    names = {v["name"] for v in out["values"]}
    assert {"Cliente no centro", "Colaboração", "Autonomia e dono"} <= names and out["method"] == "catalog"

    doc = io.BytesIO()
    with zipfile.ZipFile(doc, "w") as z:
        z.writestr("word/document.xml", "<w:document><w:p><w:t>Valorizamos inovação e testar ideias novas.</w:t></w:p></w:document>")
    out = admin.put("/api/v1/tenant/culture", json={"file": b64(doc.getvalue(), "cultura.docx")}).json()
    assert out["source_name"] == "cultura.docx" and "inovação" in out["text"]
    assert [v["name"] for v in out["values"]] == ["Inovação"]

    edited = admin.put("/api/v1/tenant/culture", json={"text": out["text"], "values": [
        {"name": "Respeito", "description": "Ouvir todo mundo."}]}).json()
    assert edited["method"] == "manual" and edited["values"][0]["id"] == "respeito"
    bad = admin.put("/api/v1/tenant/culture", json={"file": b64(b"x", "cultura.exe")})
    assert bad.status_code == 415


def test_job_suggestion_without_ai_uses_catalog(app):
    admin = company(app)
    out = admin.post("/api/v1/tenant/jobs/suggest", json={"title": "Executivo de Vendas", "description": "Negociar contratos."}).json()
    ids = [s["id"] for s in out["soft_skills"]]
    assert out["method"] == "catalog" and "negociacao" in ids and out["profile"]["gente"] >= 70


def test_import_xlsx_and_csv_detects_columns_duplicates_and_errors(app):
    admin = company(app)
    jid = job(admin)
    sheet = xlsx([["Nome completo", "E-mail"], ["Marina Alves", "Marina@Ex.com"], ["Sem e-mail", "nao-e-email"],
                  ["Rafael", "rafael@ex.com"], ["Marina de novo", "marina@ex.com"]])
    out = admin.post(f"/api/v1/tenant/jobs/{jid}/import", json=b64(sheet, "lista.xlsx")).json()
    assert out["added"] == 2 and out["duplicates"] == 1
    assert out["rejected"] == [{"row": 3, "value": "nao-e-email", "reason": "E-mail inválido"}]
    csv_out = admin.post(f"/api/v1/tenant/jobs/{jid}/import",
                         json=b64("juliana@ex.com;Juliana Souza\nrafael@ex.com;Rafael\n".encode(), "lista.csv")).json()
    assert csv_out["added"] == 1 and csv_out["duplicates"] == 1
    ranking = admin.get(f"/api/v1/tenant/jobs/{jid}").json()
    assert {c["name"] for c in ranking["candidates"]} == {"Marina Alves", "Rafael", "Juliana Souza"}
    assert all(c["stage"] == "imported" for c in ranking["candidates"])
    assert admin.post(f"/api/v1/tenant/jobs/{jid}/import", json=b64(b"a", "lista.pdf")).status_code == 415


def test_batch_send_respects_trial_quota_and_returns_links(app):
    admin = company(app)
    jid = job(admin)
    rows = [["nome", "email"]] + [[f"Pessoa {n}", f"p{n}@ex.com"] for n in range(7)]
    admin.post(f"/api/v1/tenant/jobs/{jid}/import", json=b64(xlsx(rows), "lista.xlsx"))
    out = admin.post(f"/api/v1/tenant/jobs/{jid}/send").json()
    assert out["sent"] == 5 and out["emailed"] == 0 and len(out["links"]) == 5 and "cota" in out["message"]
    stages = [c["stage"] for c in admin.get(f"/api/v1/tenant/jobs/{jid}").json()["candidates"]]
    assert stages.count("invited") == 5 and stages.count("imported") == 2
    assert admin.post(f"/api/v1/tenant/jobs/{jid}/send").json()["sent"] == 0  # sem cota, nada sai


def invited(app, admin, jid, email="marina@ex.com", name="Marina Alves"):
    admin.post(f"/api/v1/tenant/jobs/{jid}/candidates", json={"email": email, "name": name})
    link = admin.post(f"/api/v1/tenant/jobs/{jid}/send").json()["links"][-1]["link"]
    return link.rsplit("/", 1)[1]


def test_candidate_needs_consent_then_interview_produces_ranked_fit(app):
    admin = company(app)
    admin.put("/api/v1/tenant/culture", json={"text": CULTURE})
    jid = job(admin)
    token = invited(app, admin, jid)
    guest = client(app)
    preview = guest.get(f"/api/v1/auth/invites/{token}").json()
    assert preview["job"] == "Analista de Customer Success" and preview["has_account"] is False
    assert guest.post("/api/v1/auth/invites/accept", json={"token": token, "name": "Marina", "password": PW}).status_code == 422
    assert guest.post("/api/v1/auth/invites/accept",
                      json={"token": token, "name": "Marina", "password": PW, "consent": True}).status_code == 201

    interview = guest.post("/api/v1/interviews").json()
    assert interview["job_title"] == "Analista de Customer Success"
    stage = admin.get(f"/api/v1/tenant/jobs/{jid}").json()["candidates"][0]["stage"]
    assert stage == "interviewing"
    guest.post(f"/api/v1/interviews/{interview['id']}/join")
    assert FakeAgent.context["job"]["title"] == "Analista de Customer Success"
    assert "Comunicação" in FakeAgent.context["job"]["skills"] and FakeAgent.context["job"]["values"]
    guest.post(f"/api/v1/interviews/{interview['id']}/transcript", json=[{"speaker": "user", "text": t} for t in LINES])
    guest.post(f"/api/v1/interviews/{interview['id']}/finish")

    ranking = admin.get(f"/api/v1/tenant/jobs/{jid}").json()
    top = ranking["candidates"][0]
    fit = top["fit"]
    assert top["stage"] == "analyzed" and fit["method"] == "lexical"
    assert 0 < fit["overall"] <= 100 and fit["culture"] > 0 and fit["soft_skills"] > 0
    quotes = [e["quote"] for e in fit["skills_detail"] + fit["culture_detail"] if e["quote"]] + \
             [d["quote"] for d in fit["differentials"]]
    assert quotes and all(analysis.quote_in(q, LINES) for q in quotes)
    assert fit["differentials"] and set(fit["profile_detail"]) == {"fazer", "gente", "pensar", "forca"}
    assert sum(b["count"] for b in ranking["distribution"]) == 1 and ranking["median"] == fit["overall"]
    assert ranking["job"]["funnel"] == {"imported": 1, "invited": 1, "started": 1, "analyzed": 1}
    assert ranking["job"]["top_fit"] == fit["overall"]

    # A pessoa pode retirar o consentimento: a análise some da empresa.
    guest.post(f"/api/v1/interviews/{interview['id']}/share", json={"share_with_tenant": False})
    hidden = admin.get(f"/api/v1/tenant/jobs/{jid}").json()["candidates"][0]
    assert hidden["stage"] == "private" and hidden["fit"] is None


def test_existing_account_accepts_second_job_with_password(app):
    admin = company(app)
    first, second = job(admin), job(admin, title="Analista de Retenção")
    token = invited(app, admin, first)
    client(app).post("/api/v1/auth/invites/accept", json={"token": token, "name": "Marina", "password": PW, "consent": True})
    token2 = invited(app, admin, second)
    guest = client(app)
    assert guest.get(f"/api/v1/auth/invites/{token2}").json()["has_account"] is True
    wrong = guest.post("/api/v1/auth/invites/accept", json={"token": token2, "password": "errada-123456", "consent": True})
    assert wrong.status_code == 401
    me = guest.post("/api/v1/auth/invites/accept", json={"token": token2, "password": PW, "consent": True}).json()
    assert me["credits"] == 2


def test_wellbeing_alert_keeps_fit_private(app):
    admin = company(app)
    jid = job(admin)
    token = invited(app, admin, jid)
    guest = client(app)
    guest.post("/api/v1/auth/invites/accept", json={"token": token, "name": "Marina", "password": PW, "consent": True})
    iid = guest.post("/api/v1/interviews").json()["id"]
    guest.post(f"/api/v1/interviews/{iid}/join")
    guest.post(f"/api/v1/interviews/{iid}/transcript", json=[{"speaker": "user", "text": "Às vezes tenho vontade de morrer no trabalho."}])
    guest.post(f"/api/v1/interviews/{iid}/finish")
    row = admin.get(f"/api/v1/tenant/jobs/{jid}").json()["candidates"][0]
    assert row["stage"] == "private" and row["fit"] is None


def test_participant_cannot_manage_jobs(app):
    admin = company(app)
    jid = job(admin)
    token = invited(app, admin, jid)
    guest = client(app)
    guest.post("/api/v1/auth/invites/accept", json={"token": token, "name": "Marina", "password": PW, "consent": True})
    assert guest.get("/api/v1/tenant/jobs").status_code == 403
    assert guest.get(f"/api/v1/tenant/jobs/{jid}").status_code == 403
