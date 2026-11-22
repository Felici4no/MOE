"""Cliente teste: uma empresa fictícia com UMA vaga de Product Manager avaliada por simulação.

A pessoa candidata conversa, nesta ordem, com o time de desenvolvimento (tech lead e dev),
a gerência de engenharia e a diretoria de produto. Cada personagem tem objetivo, preocupações
e memória: reage ao que foi dito e lembra o que a pessoa falou para quem veio antes.

Uso local:
    cd backend && .venv/bin/python -m app.seed_cliente_teste
Na VM (produção), com senha aleatória gravada só em um arquivo 600 indicado por você:
    sudo ... python -m app.seed_cliente_teste --allow-prod --password-file /root/cliente-teste.txt

Cria (ou recria) o locatário "Fluxo · cliente teste" com:
- administradora  rh@fluxo-teste.dev
- candidata       candidata@fluxo-teste.dev   (convite aceito, com consentimento)
Senha das duas contas: SENHA abaixo (só para uso local). Dados fictícios.
"""
import argparse
import os
import secrets
from datetime import UTC, datetime

from sqlalchemy import delete, select

from app.core.config import get_settings
from app.core.db import Database
from app.core.security import hash_password
from app.models import (AccountKind, Candidate, Culture, Invite, InviteStatus, Job, Membership, Role, Tenant, User)
from app.moe.models import MoePersona, MoePoint, MoeScenario, MoeSession
from app.moe.schemas import PersonaIn, PointIn, ScenarioIn
from app.moe.service import MoeAdmin

SLUG = "fluxo-cliente-teste"
COMPANY = "Fluxo · cliente teste"
ADMIN = ("Renata Prado", "rh@fluxo-teste.dev")
CANDIDATE = ("Camila Rocha", "candidata@fluxo-teste.dev")
SENHA = "fluxo-teste-2026"

CULTURE_TEXT = (
    "A Fluxo é uma fintech de pagamentos para pequenas empresas. Decidimos com dados: toda prioridade "
    "vem com o problema do cliente e o número que queremos mover. O cliente está no centro, mas o time "
    "decide junto como construir. Falamos com transparência sobre riscos e prazos, mesmo quando a notícia é ruim. "
    "Cada pessoa é dona do que entrega e combina próximos passos claros.")
CULTURE_VALUES = [
    {"id": "decisao-com-dados", "name": "Decisão com dados", "description": "Prioridades vêm com o problema e o número que queremos mover."},
    {"id": "cliente", "name": "Cliente no centro", "description": "As decisões partem do problema de quem usa o produto."},
    {"id": "colaboracao", "name": "Colaboração", "description": "O time decide junto como construir."},
    {"id": "transparencia", "name": "Transparência", "description": "Riscos e prazos são ditos com clareza, mesmo quando a notícia é ruim."},
    {"id": "autonomia", "name": "Autonomia e dono", "description": "Cada pessoa é dona do que entrega e combina próximos passos."},
]

JOB = {
    "title": "Product Manager · Pagamentos recorrentes",
    "description": (
        "Responsável pelo produto de cobranças da Fluxo. Leva demandas de clientes ao time de engenharia, "
        "negocia escopo e prazo, prioriza o roadmap com dados e apresenta decisões para gerência e diretoria. "
        "Trabalha em sprints quinzenais com um squad de 5 devs."),
    "soft_skills": [
        {"id": "comunicacao", "name": "Comunicação", "level": "essencial"},
        {"id": "negociacao", "name": "Negociação", "level": "essencial"},
        {"id": "pensamento-critico", "name": "Pensamento crítico", "level": "essencial"},
        {"id": "lideranca", "name": "Liderança", "level": "desejavel"},
        {"id": "empatia", "name": "Empatia", "level": "desejavel"},
    ],
    "hard_skills": [
        {"id": "roadmap", "name": "Priorização de roadmap", "level": "essencial"},
        {"id": "metricas", "name": "Métricas de produto", "level": "essencial"},
        {"id": "requisitos", "name": "Escrita de requisitos", "level": "essencial"},
        {"id": "negocio", "name": "Visão de negócio", "level": "desejavel"},
        {"id": "tecnico", "name": "Noções técnicas", "level": "desejavel"},
    ],
    "profile": {"fazer": 70, "gente": 80, "pensar": 75, "forca": 60},
    "profile_note": "Ritmo alto, muita negociação com engenharia e com a liderança.",
}

POINTS = [
    {"key": "time", "name": "Alinhamento com o time técnico", "weight": 5,
     "description": "Como a pessoa leva uma mudança ao time de devs: contexto, escopo e respeito ao que já estava combinado.",
     "signals": ["Explica o problema do cliente", "Define o mínimo da primeira versão", "Considera a dívida técnica", "Chama o time para estimar"]},
    {"key": "tradeoff", "name": "Priorização e trade-offs", "weight": 5,
     "description": "Como decide o que entra e o que sai quando a capacidade é fixa.",
     "signals": ["Diz o que sai da sprint", "Compara valor e esforço", "Assume o custo da troca"]},
    {"key": "stakeholders", "name": "Gestão de stakeholders", "weight": 4,
     "description": "Como comunica plano, risco e status para a gerência.",
     "signals": ["Apresenta plano com risco", "Propõe plano B", "Combina como vai atualizar"]},
    {"key": "negocio", "name": "Visão de negócio e métricas", "weight": 4,
     "description": "Como justifica a decisão para a diretoria e diz como medir o sucesso.",
     "signals": ["Liga a demanda a receita ou retenção", "Define métrica de sucesso", "Faz uma recomendação clara"]},
]

PERSONAS = [
    {"key": "rafa", "name": "Rafa", "role": "Tech lead do time de devs", "look": 2, "stance": "cetica", "voice_tone": "objetiva",
     "traits": ["protege o foco do time", "pragmático"],
     "speaking_style": "Fala pouco, vai direto ao impacto técnico e não aceita prazo sem estimativa.",
     "goal": "Proteger o foco da sprint e a qualidade do código sem travar o negócio.",
     "concerns": [
         {"topic": "Por que agora", "keywords": ["cliente", "contrato", "problema", "usuario", "perder", "dado", "churn"],
          "probe": "Por que isso passa na frente do que já combinamos para esta sprint?",
          "ack": "Ok, agora entendi o motivo."},
         {"topic": "Escopo mínimo", "keywords": ["mvp", "minimo", "primeira versao", "escopo", "fatia", "corte", "fica de fora"],
          "probe": "O que exatamente entra nessa primeira versão e o que fica de fora?",
          "ack": "Bom ter o escopo fechado."},
         {"topic": "Dívida técnica", "keywords": ["migracao", "divida", "banco", "qualidade", "teste", "refator"],
          "probe": "E a migração do banco que está na sprint, vai ficar para depois?",
          "ack": "Que bom que você pensou na migração."},
         {"topic": "Estimativa do time", "keywords": ["estimativa", "estimar", "time decide", "refinamento", "voces", "juntos"],
          "probe": "Você vai querer uma estimativa nossa antes de prometer data para o cliente?",
          "ack": "Gosto de ver o time na estimativa."},
     ]},
    {"key": "julia", "name": "Júlia", "role": "Desenvolvedora backend", "look": 5, "stance": "colaborativa", "voice_tone": "calorosa",
     "traits": ["curiosa", "detalhista"],
     "speaking_style": "Pensa em voz alta, faz perguntas de caso de uso e propõe caminhos técnicos.",
     "goal": "Entender o problema a fundo para propor a solução técnica mais simples.",
     "concerns": [
         {"topic": "Critérios de aceite", "keywords": ["criterio", "aceite", "historia", "requisito", "regra", "caso de uso"],
          "probe": "Quais são os critérios de aceite? Como eu sei que terminei?",
          "ack": "Com critério de aceite fica bem mais fácil."},
         {"topic": "Casos de erro", "keywords": ["falha", "erro", "cartao recusado", "inadimpl", "estorno", "retentativa"],
          "probe": "E se o cartão do cliente final for recusado na cobrança recorrente, o que a gente faz?",
          "ack": "Boa, os casos de erro são onde mais quebra."},
         {"topic": "Integração", "keywords": ["gateway", "api", "integracao", "parceiro", "webhook"],
          "probe": "Vamos usar o gateway que já temos ou precisa de integração nova?",
          "ack": "Faz sentido usar o que já temos."},
     ]},
    {"key": "marcos", "name": "Marcos", "role": "Gerente de engenharia", "look": 0, "stance": "direta", "voice_tone": "firme",
     "traits": ["organizado", "avesso a surpresas"],
     "speaking_style": "Quer o plano em três frases: o que, quando e qual o risco.",
     "goal": "Decidir hoje o que sai da sprint sem surpresas para os outros times.",
     "concerns": [
         {"topic": "O que sai da sprint", "keywords": ["adiar", "sai da sprint", "tirar", "troca", "em vez", "prioriz", "depois"],
          "probe": "O que sai da sprint para isso caber? Preciso de uma resposta clara.",
          "ack": "Entendi o que sai."},
         {"topic": "Risco e plano B", "keywords": ["risco", "plano b", "dependencia", "se der errado", "atraso", "contingencia"],
          "probe": "Qual é o maior risco desse plano e qual o seu plano B?",
          "ack": "Bom, você já pensou no risco."},
         {"topic": "Comunicação", "keywords": ["atualizar", "status", "alinhar", "comunicar", "avisar", "report"],
          "probe": "Como você vai manter os outros times e eu atualizados até a entrega?",
          "ack": "Combinado o ritmo de atualização."},
     ]},
    {"key": "helena", "name": "Helena", "role": "Diretora de produto", "look": 4, "stance": "apressada", "voice_tone": "objetiva",
     "traits": ["estratégica", "exigente com números"],
     "speaking_style": "Tem pouco tempo, pede a recomendação primeiro e os números depois.",
     "goal": "Decidir se a mudança de rota vale para o negócio.",
     "concerns": [
         {"topic": "Impacto no negócio", "keywords": ["receita", "contrato", "mrr", "reais", "milhoes", "retencao", "churn", "cliente grande"],
          "probe": "Quanto esse cliente representa para o negócio, em receita ou retenção?",
          "ack": "Ok, o impacto ficou claro."},
         {"topic": "Métrica de sucesso", "keywords": ["metrica", "medir", "indicador", "kpi", "sucesso", "taxa", "okr"],
          "probe": "Como vamos saber, em um mês, se essa decisão deu certo?",
          "ack": "Gosto de ter a métrica definida."},
         {"topic": "Recomendação", "keywords": ["recomendo", "proponho", "sugiro", "minha proposta", "decisao", "eu faria"],
          "probe": "Qual é a sua recomendação, em uma frase?",
          "ack": "Recomendação clara, obrigada."},
     ]},
]

SCENARIO = {
    "title": "Nova prioridade no meio da sprint",
    "description": ("Um cliente grande pediu cobrança recorrente até o fim do mês, e a sprint já está cheia com a migração do banco. "
                    "Você leva o tema ao time de devs, depois à gerência e à diretoria."),
    "pressure": 4, "tone": "tenso", "follow_ups": True,
    "scenes": [
        {"id": "time-devs", "persona": "rafa", "stage": "Time de desenvolvimento", "points": ["time", "tradeoff"],
         "line": "Fiquei sabendo que chegou um pedido de cobrança recorrente, e a sprint já está cheia com a migração do banco. Como você quer trazer isso para o time?"},
        {"id": "dev-backend", "persona": "julia", "stage": "Time de desenvolvimento", "points": ["time"],
         "line": "Eu posso começar a integração, mas preciso entender o que o cliente precisa no mínimo para usar. O que você espera da primeira versão?"},
        {"id": "gerencia", "persona": "marcos", "stage": "Gerência", "points": ["tradeoff", "stakeholders"],
         "line": "Preciso decidir hoje o que muda na sprint. Qual é o seu plano?"},
        {"id": "diretoria", "persona": "helena", "stage": "Diretoria", "points": ["negocio", "tradeoff"],
         "line": "Tenho cinco minutos. Esse cliente vale a mudança de rota? Me diga sua recomendação."},
    ],
}


def _user(db, name: str, email: str, password: str = SENHA) -> User:
    user = User(name=name, email=email, password_hash=hash_password(password), kind=AccountKind.member)
    db.add(user)
    db.flush()
    return user


def reset(db) -> None:
    tenant = db.scalar(select(Tenant).where(Tenant.slug == SLUG))
    if tenant:
        for model in (MoeSession, MoeScenario, MoePersona, MoePoint, Candidate, Invite, Job, Culture):
            db.execute(delete(model).where(model.tenant_id == tenant.id))
        users = [m.user_id for m in db.scalars(select(Membership).where(Membership.tenant_id == tenant.id))]
        db.execute(delete(Membership).where(Membership.tenant_id == tenant.id))
        from app.models import Credit, Interview, Result
        for uid in users:
            for iv in db.scalars(select(Interview).where(Interview.user_id == uid)):
                db.execute(delete(Result).where(Result.interview_id == iv.id))
            db.execute(delete(Interview).where(Interview.user_id == uid))
            db.execute(delete(Credit).where(Credit.user_id == uid))
            db.execute(delete(User).where(User.id == uid))
        db.delete(tenant)
        db.commit()
    for email in (ADMIN[1], CANDIDATE[1]):  # contas soltas de execuções anteriores
        db.execute(delete(User).where(User.email == email))
    db.commit()


def seed(db, settings, password: str = SENHA, allow_prod: bool = False) -> dict:
    if settings.env == "prod" and (not allow_prod or password == SENHA):
        raise SystemExit("Em produção use --allow-prod com --password-file (senha aleatória, nunca a do repositório).")
    reset(db)
    now = datetime.now(UTC)
    tenant = Tenant(name=COMPANY, slug=SLUG, plan="empresa", subscription_status="active",
                    stripe_subscription_id="dev_cliente_teste", period_start=now)
    db.add(tenant)
    db.flush()
    admin = _user(db, *ADMIN, password=password)
    db.add(Membership(tenant_id=tenant.id, user_id=admin.id, role=Role.owner))
    db.add(Culture(tenant_id=tenant.id, text=CULTURE_TEXT, values=CULTURE_VALUES, method="manual", updated_at=now))
    db.commit()

    moe = MoeAdmin(db, settings, admin)
    points = {p["key"]: moe.save_point(PointIn(**{k: p[k] for k in ("name", "description", "signals", "weight")})).id for p in POINTS}
    personas = {p["key"]: moe.save_persona(PersonaIn(**{k: v for k, v in p.items() if k != "key"})).id for p in PERSONAS}
    sc = moe.save_scenario(ScenarioIn(
        title=SCENARIO["title"], description=SCENARIO["description"], pressure=SCENARIO["pressure"], tone=SCENARIO["tone"],
        follow_ups=SCENARIO["follow_ups"], point_ids=list(points.values()),
        scenes=[{"id": s["id"], "persona_id": personas[s["persona"]], "line": s["line"], "stage": s["stage"],
                 "point_ids": [points[k] for k in s["points"]]} for s in SCENARIO["scenes"]]))
    moe.publish(sc.id)

    job = Job(tenant_id=tenant.id, created_by=admin.id, title=JOB["title"], description=JOB["description"],
              soft_skills=JOB["soft_skills"], hard_skills=JOB["hard_skills"], profile=JOB["profile"],
              profile_note=JOB["profile_note"], assessment="simulacao", scenario_id=sc.id)
    db.add(job)
    db.flush()

    # Uma candidata já com convite aceito e consentimento, pronta para jogar.
    person = _user(db, *CANDIDATE, password=password)
    db.add(Membership(tenant_id=tenant.id, user_id=person.id, role=Role.participant))
    invite = Invite(tenant_id=tenant.id, job_id=job.id, email=person.email, name=person.name, token_hash=f"seed-{job.id}",
                    tests=["simulacao"], status=InviteStatus.used, invited_by=admin.id, expires_at=now, used_by=person.id)
    db.add(invite)
    db.flush()
    db.add(Candidate(job_id=job.id, tenant_id=tenant.id, email=person.email, name=person.name, invite_id=invite.id,
                     user_id=person.id, consent_at=now))
    db.commit()
    return {"tenant": tenant.name, "job": job.title, "scenario": sc.title, "admin": ADMIN[1], "candidate": CANDIDATE[1]}


def main() -> None:
    parser = argparse.ArgumentParser(description="Cria o cliente teste (Product Manager)")
    parser.add_argument("--allow-prod", action="store_true", help="permite rodar com PF_ENV=prod")
    parser.add_argument("--password-file", help="gera senha aleatória e grava só neste arquivo (600)")
    args = parser.parse_args()
    password = SENHA
    if args.password_file:
        password = secrets.token_urlsafe(18)
        fd = os.open(args.password_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(f"{ADMIN[1]}\n{CANDIDATE[1]}\nsenha: {password}\n")
    settings = get_settings()
    database = Database(settings.database_url)
    database.create_all()
    with database.sessions() as db:
        out = seed(db, settings, password, args.allow_prod)
    print(f"Cliente teste pronto: {out['tenant']} · vaga {out['job']} · simulação {out['scenario']}")
    where = args.password_file or "o topo de app/seed_cliente_teste.py"
    print(f"Empresa: {out['admin']} · Candidata: {out['candidate']} · senha em {where}")


if __name__ == "__main__":
    main()
