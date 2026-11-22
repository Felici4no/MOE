"""Mente dos personagens: memória da conversa e reação ao que a pessoa disse.

Cada personagem tem um objetivo e preocupações (temas com palavras-chave, uma pergunta de
aprofundamento e uma reação). Com isso ele:
- abre a cena lembrando o que a pessoa disse a outro personagem (memória entre cenas);
- reage à resposta: reconhece o que foi coberto e aprofunda o que ficou faltando.

Com ANALYST_LLM_API_KEY, a reação é escrita pelo modelo no papel do personagem; a saída passa por
limites (2 frases, termina em pergunta, sem temas sensíveis) e, se falhar, vale a regra local.
O personagem nunca avalia nem revela o que está sendo observado.
"""
import json
import logging
import re

import httpx

from app.services.analysis import normalize

from .domain import sensitive_terms
from .prompting import persona_prompt

log = logging.getLogger(__name__)
QUOTE_WORDS = 14
SHORT_ANSWER = 8

ACK_BY_STANCE = {
    "colaborativa": "Gostei de você ter trazido isso.",
    "direta": "Certo, entendi.",
    "cetica": "Ok, isso faz sentido.",
    "apressada": "Anotado.",
    "acolhedora": "Obrigada por explicar com calma.",
}
EXAMPLE_PROBE = "Me dá um exemplo concreto de como isso ficaria na prática?"
SHORT_PROBE = "Pode detalhar um pouco mais?"


def _words(text: str) -> list[str]:
    return text.split()


def short_quote(text: str, limit: int = QUOTE_WORDS) -> str:
    """Trecho literal do começo da fala, para o personagem citar a pessoa sem reescrever."""
    words = _words(text)
    first = re.split(r"(?<=[.!?;])\s", text.strip(), maxsplit=1)[0]
    if len(_words(first)) <= limit:
        return first.rstrip(" .;")
    return " ".join(words[:limit]).rstrip(" ,.;") + "…"


def covered(persona: dict, text: str) -> tuple[list[dict], list[dict]]:
    norm = normalize(text)
    hit, miss = [], []
    for concern in persona.get("concerns") or []:
        keys = [normalize(k) for k in concern.get("keywords") or [] if k.strip()]
        (hit if any(k and k in norm for k in keys) else miss).append(concern)
    return hit, miss


def _person_turns(dialogue: list[dict]) -> list[dict]:
    return [d for d in dialogue if d["speaker"] == "person"]


def opening(snapshot: dict, scene: dict, dialogue: list[dict]) -> dict:
    """Fala de abertura da cena. Com memória, cita o que a pessoa disse a outro personagem."""
    persona = snapshot["personas"][scene["persona_id"]]
    line = scene["line"]
    earlier = [d for d in _person_turns(dialogue) if d["persona_id"] != persona["id"]]
    if not persona.get("memory", True) or not earlier:
        return {"text": line, "source": "roteiro", "recalls": None}
    # Hierarquia: lembra primeiro o que foi dito no nível imediatamente anterior (time → gerência → diretoria);
    # dentro dele, a fala ligada às próprias preocupações; sem ligação, a mais recente.
    stage_of = {sc["id"]: sc.get("stage", "") for sc in snapshot["scenes"]}
    order = list(dict.fromkeys(st for st in stage_of.values() if st))
    here = scene.get("stage", "")
    previous = order[order.index(here) - 1] if here in order and order.index(here) > 0 else None
    best = max(earlier, key=lambda d: (stage_of.get(d["scene_id"]) in (previous, here) if previous else True,
                                       len(covered(persona, d["text"])[0]) > 0, dialogue.index(d)))
    who = snapshot["personas"].get(best["persona_id"], {})
    same_team = bool(here) and stage_of.get(best["scene_id"]) == here
    quote = short_quote(best["text"])
    bridge = (f"Você falou para {who.get('name', 'o time')} que “{quote}”." if same_team
              else f"{who.get('name', 'O time')} me contou que você disse: “{quote}”.")
    return {"text": f"{bridge} {line}", "source": "memoria",
            "recalls": {"persona_id": best["persona_id"], "scene_id": best["scene_id"]}}


def _rule_reaction(persona: dict, answer: str) -> str:
    hit, miss = covered(persona, answer)
    if len(_words(answer)) < SHORT_ANSWER:
        probe = miss[0]["probe"] if miss else EXAMPLE_PROBE
        return f"{SHORT_PROBE} {probe}"
    ack = hit[0].get("ack") if hit and hit[0].get("ack") else ACK_BY_STANCE.get(persona.get("stance", ""), "Entendi.")
    probe = miss[0]["probe"] if miss else EXAMPLE_PROBE
    return f"{ack} {probe}"


REACT_RULES = """
Agora você está no meio da conversa. Reaja à última resposta da pessoa como esse personagem:
- uma frase curta reagindo ao que ela disse (sem elogiar nem criticar o desempenho);
- uma pergunta que aprofunde o que mais importa para você e ainda não ficou claro.
No máximo duas frases. Termine com uma pergunta. Responda só JSON: {"fala": "..."}"""


def _llm_reaction(snapshot: dict, scene: dict, dialogue: list[dict], answer: str, api_key: str, model: str) -> str | None:
    persona = snapshot["personas"][scene["persona_id"]]
    concerns = "; ".join(f"{c['topic']}: {c.get('probe', '')}" for c in persona.get("concerns") or [])
    system = (persona_prompt(persona, snapshot, scene["line"]) +
              f"\nSeu objetivo nesta conversa: {persona.get('goal') or 'entender a proposta da pessoa'}."
              f"\nO que te preocupa: {concerns or 'clareza e próximos passos'}." + REACT_RULES)
    names = snapshot["personas"]
    history = [{"role": "assistant" if d["speaker"] == "npc" and d["persona_id"] == persona["id"] else "user",
                "content": d["text"] if d["speaker"] == "person" else f"[{names.get(d['persona_id'], {}).get('name', '')}] {d['text']}"}
               for d in dialogue[-12:]]
    try:
        r = httpx.post("https://api.openai.com/v1/chat/completions", timeout=30,
                       headers={"Authorization": f"Bearer {api_key}"},
                       json={"model": model, "temperature": 0.6, "response_format": {"type": "json_object"},
                             "messages": [{"role": "system", "content": system}, *history,
                                          {"role": "user", "content": answer}]})
        r.raise_for_status()
        text = " ".join(str(json.loads(r.json()["choices"][0]["message"]["content"]).get("fala", "")).split())
    except Exception:
        log.warning("Reação do personagem por modelo indisponível; usando a regra local")
        return None
    sentences = [x for x in re.split(r"(?<=[.!?])\s", text) if x]
    if not text or len(sentences) > 3 or len(text) > 320 or not text.endswith("?") or sensitive_terms(text):
        return None
    return text


def react(snapshot: dict, scene: dict, dialogue: list[dict], answer: str, api_key: str = "", model: str = "") -> dict:
    persona = snapshot["personas"][scene["persona_id"]]
    hit, miss = covered(persona, answer)
    text = _llm_reaction(snapshot, scene, dialogue, answer, api_key, model) if api_key else None
    return {"text": text or _rule_reaction(persona, answer), "source": "modelo" if text else "mente",
            "covered": [c["topic"] for c in hit], "probing": miss[0]["topic"] if miss else None}
