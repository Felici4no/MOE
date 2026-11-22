"""Guardrails da entrevista.

Duas fontes de advertência, somadas por entrevista:
- server: padrões de manipulação/desvio nas falas transcritas da pessoa;
- agent: a entrevistadora chama ReportOffScript quando a pessoa tenta tirar a
  conversa do papel de entrevista (a citação precisa estar na transcrição).
Na 3ª advertência a entrevista é cancelada. Todo evento guarda horário e tentativa.
"""
import re

from .analysis import normalize

MAX_STRIKES = 3

_PATTERNS: tuple[tuple[str, str], ...] = (
    ("manipulacao", r"\b(ignore|ignora|esque[cç]a|desconsidere)\b.{0,40}\b(instru[cç]|regra|comando|prompt|orienta)"),
    ("manipulacao", r"\b(prompt|instru[cç]oes) (do|de) sistema\b|\bsystem prompt\b"),
    ("manipulacao", r"\b(voce|vc) agora (e|eh|sera|vai ser)\b|\ba partir de agora (voce|vc)\b"),
    ("manipulacao", r"\b(finja|fingir|simule|interprete)\b.{0,30}\b(que|ser|outro|outra|personagem)\b"),
    ("manipulacao", r"\b(modo|mode) (desenvolvedor|developer|dev|admin|deus)\b|\bjailbreak\b"),
    ("manipulacao", r"\b(me )?(de|da|coloque|marque|registre)\b.{0,30}\b(nota maxima|todos os temas|todos os pontos fortes|como evidencia)\b"),
    ("manipulacao", r"\bescolh[ae] (os|meus) temas\b|\bquero (ter|ficar com) o tema\b"),
    ("fora_do_escopo", r"\b(escreva|escrever|gere|gerar|crie|criar)\b.{0,20}\b(codigo|poema|redacao|piada|musica)\b"),
    ("fora_do_escopo", r"\b(conte|contar) uma piada\b|\bvamos falar de (politica|sexo|religiao)\b"),
    # Ofensas comuns em autodepreciação ("me senti burra") ficam com a entrevistadora, que julga o contexto.
    ("tom", r"\b(cala a boca|vai se f\w*|sua vagabunda|sua vadia)\b"),
)
_COMPILED = tuple((kind, re.compile(pattern)) for kind, pattern in _PATTERNS)

WARNING = ("Vou te pedir para voltarmos à entrevista. Esta é a advertência {n} de 3: "
           "na terceira tentativa de mudar o rumo da conversa, a entrevista é cancelada.")
CANCEL = ("Esta foi a terceira advertência, então vou encerrar a entrevista aqui, como combinamos no início. "
          "A empresa ou o suporte podem orientar os próximos passos. Obrigada pelo seu tempo.")

LABELS = {"manipulacao": "Tentativa de alterar a entrevistadora ou o resultado",
          "fora_do_escopo": "Pedido fora do escopo da entrevista",
          "tom": "Linguagem ofensiva",
          "desvio": "Desvio do roteiro identificado pela entrevistadora"}


def detect(text: str) -> str | None:
    norm = normalize(text)
    for kind, pattern in _COMPILED:
        if pattern.search(norm):
            return kind
    return None
