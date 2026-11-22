"""Os três planos da empresa. Valores são ESTIMATIVAS para validação comercial.

Equipe e Empresa: assinatura mensal. Enterprise: sempre contato direto, sem checkout.
"""
from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True)
class Plan:
    id: str
    name: str
    audience: Literal["empresa"]
    billing: Literal["monthly", "contact"]
    price_cents: int | None          # estimativa, em centavos de BRL
    interviews: int | None           # entrevistas por mês; None = sob medida
    lookup_key: str | None           # Price da Stripe (lookup_key), criado por scripts/stripe_catalog.py
    pitch: str
    features: tuple[str, ...] = field(default_factory=tuple)


PLANS = (
    Plan("equipe", "Equipe", "empresa", "monthly", 89000, 15, "pf_equipe_monthly",
         "Para times que abrem poucas vagas por mês.",
         ("15 entrevistas por mês", "Cultura e vagas ilimitadas", "Convite em lote por planilha",
          "Ranking de fit com evidências")),
    Plan("empresa", "Empresa", "empresa", "monthly", 249000, 50, "pf_empresa_monthly",
         "Para RH com processos seletivos contínuos.",
         ("50 entrevistas por mês", "Tudo do Equipe", "Análises consolidadas por vaga",
          "Suporte prioritário")),
    Plan("enterprise", "Enterprise", "empresa", "contact", None, None, None,
         "Volume, marca e integrações sob medida.",
         ("Volume sob medida", "Integração com ATS sob demanda", "Voz com a sua marca",
          "SLA, contrato e faturamento dedicado")),
)

PLANS_BY_ID = {plan.id: plan for plan in PLANS}
PLANS_BY_LOOKUP = {plan.lookup_key: plan for plan in PLANS if plan.lookup_key}
TRIAL_INVITES = 5  # empresa sem plano ativo testa com 5 convites (o bastante para ver um ranking)
