"""Os quatro escopos de aquisição. Valores são ESTIMATIVAS para validação comercial.

1 Individual: pagamento único (um item). 2 e 3: assinatura mensal da empresa.
4 Enterprise: sempre contato direto, sem checkout.
"""
from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True)
class Plan:
    id: str
    name: str
    audience: Literal["individual", "empresa"]
    billing: Literal["one_time", "monthly", "contact"]
    price_cents: int | None          # estimativa, em centavos de BRL
    interviews: int | None           # por compra (individual) ou por mês (empresa); None = sob medida
    lookup_key: str | None           # Price da Stripe (lookup_key), criado por scripts/stripe_catalog.py
    pitch: str
    features: tuple[str, ...] = field(default_factory=tuple)


PLANS = (
    Plan("individual", "Individual", "individual", "one_time", 14900, 1, "pf_individual_once",
         "Uma entrevista para você descobrir seus pontos fortes.",
         ("1 entrevista com a Lia, até 3 tentativas", "Perfil com evidências nas suas palavras",
          "Recibo e nota da Stripe")),
    Plan("equipe", "Equipe", "empresa", "monthly", 89000, 15, "pf_equipe_monthly",
         "Para times e consultorias que avaliam algumas pessoas por mês.",
         ("15 entrevistas por mês", "Painel de pessoas e convites", "Integração com ATS como Gupy",
          "Até 3 administradores")),
    Plan("empresa", "Empresa", "empresa", "monthly", 249000, 50, "pf_empresa_monthly",
         "Para RH que usa a entrevista em seleção e desenvolvimento.",
         ("50 entrevistas por mês", "Integração com ATS como Gupy e outras plataformas de RH",
          "Relatório consolidado do time", "Suporte prioritário")),
    Plan("enterprise", "Enterprise", "empresa", "contact", None, None, None,
         "Volume, marca e integrações sob medida.",
         ("Volume sob medida", "Integrações com Gupy, ATS e HRIS sob demanda", "Voz com a sua marca",
          "SLA, contrato e faturamento dedicado")),
)

PLANS_BY_ID = {plan.id: plan for plan in PLANS}
PLANS_BY_LOOKUP = {plan.lookup_key: plan for plan in PLANS if plan.lookup_key}
TRIAL_INVITES = 2  # empresa sem plano ativo pode testar com 2 convites
