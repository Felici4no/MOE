"""Testes que uma pessoa pode fazer. Os dois vêm do roteiro do Mapa de Talentos."""
from dataclasses import dataclass


@dataclass(frozen=True)
class InterviewTest:
    id: str
    name: str
    minutes: str
    description: str


TESTS = (
    InterviewTest("completa", "Mapa de Talentos", "cerca de 10 minutos",
                  "Entrevista completa: 4 a 6 histórias reais, interesses e devolutiva. Gera o Mapa com até 3 talentos."),
    InterviewTest("rapida", "Mapa rápido", "cerca de 3 minutos",
                  "Versão curta (modo demonstração): 3 histórias de domínios diferentes e uma pergunta de interesse."),
)
TESTS_BY_ID = {t.id: t for t in TESTS}
DEFAULT_TESTS = ("completa",)

QUICK_MODE = """
# MODO DEMONSTRAÇÃO (este teste)
Faça a versão de cerca de 3 minutos: 1 pergunta de aquecimento, 3 histórias de domínios diferentes,
1 pergunta de interesse, a devolutiva curta e o encerramento. Não pule a espera pelas respostas.
"""
