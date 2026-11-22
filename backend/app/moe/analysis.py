"""Análise por ponto. Nunca há nota: para cada ponto, quais sinais apareceram e com quais
frases literais do participante. Falas de personagens nunca contam como evidência."""
import json
import logging

import httpx

from app.services.analysis import in_utterance, wellbeing_alert

log = logging.getLogger(__name__)

NOTICE = ("Esta é uma simulação fictícia. A leitura abaixo mostra onde suas respostas tocaram os pontos "
          "que a empresa quis explorar; não é nota, não comprova competências e não decide oportunidades.")

PROMPT = """Você lê respostas dadas em uma SIMULAÇÃO fictícia de escritório.
Para cada ponto, diga quais sinais observáveis aparecem nas respostas e copie trechos LITERAIS
(até 25 palavras, pode cortar com "...", nunca reescrever). Não dê nota, não julgue a pessoa,
não infira traços de personalidade, saúde ou vida pessoal. Se nada sustentar o ponto, deixe vazio.
Responda só JSON: {"points": [{"point_id": "...", "signals": ["sinal do catálogo"], "quotes": ["trecho literal"], "note": "uma frase descritiva, sem julgamento"}]}"""


def _ordered(points: dict) -> list[dict]:
    return sorted(points.values(), key=lambda p: (-p["weight"], p["name"]))


def mapping(snapshot: dict, answers: list[dict]) -> list[dict]:
    """Sem modelo de linguagem: agrupa as respostas pelas cenas que exploram cada ponto."""
    by_scene: dict[str, list[str]] = {}
    for a in answers:
        by_scene.setdefault(a["scene_id"], []).append(a["quote"])
    out = []
    for p in _ordered(snapshot["points"]):
        quotes = [q for s in snapshot["scenes"] if p["id"] in s["point_ids"] for q in by_scene.get(s["id"], [])]
        out.append({"point_id": p["id"], "name": p["name"], "weight": p["weight"], "signals": [], "quotes": quotes,
                    "note": "Respostas às cenas que exploram este ponto. Sem interpretação automática." if quotes
                    else "Nenhuma cena respondida explorou este ponto."})
    return out


def validate(snapshot: dict, answers: list[dict], proposal: list[dict]) -> list[dict]:
    """Mantém só pontos conhecidos, sinais do catálogo do ponto e citações literais das respostas."""
    texts = [a["quote"] for a in answers]
    proposed = {p.get("point_id"): p for p in proposal if isinstance(p, dict)}
    out = []
    for p in _ordered(snapshot["points"]):
        prop = proposed.get(p["id"], {})
        quotes = [q.strip() for q in prop.get("quotes", []) if isinstance(q, str) and any(in_utterance(q, t) for t in texts)]
        quotes = list(dict.fromkeys(quotes))[:3]
        signals = [s for s in prop.get("signals", []) if s in p["signals"]] if quotes else []
        note = prop.get("note") if isinstance(prop.get("note"), str) and quotes else ""
        out.append({"point_id": p["id"], "name": p["name"], "weight": p["weight"], "signals": signals, "quotes": quotes,
                    "note": (note or "")[:240] if quotes else "Nenhuma resposta sustentou este ponto com uma frase literal."})
    return out


def llm(snapshot: dict, answers: list[dict], api_key: str, model: str) -> list[dict] | None:
    points = [{"point_id": p["id"], "name": p["name"], "description": p["description"], "signals": p["signals"]}
              for p in snapshot["points"].values()]
    scenes = {s["id"]: s["line"] for s in snapshot["scenes"]}
    respostas = [{"pergunta_do_personagem": scenes.get(a["scene_id"], ""), "resposta_do_participante": a["quote"]} for a in answers]
    try:
        r = httpx.post("https://api.openai.com/v1/chat/completions", timeout=60,
                       headers={"Authorization": f"Bearer {api_key}"},
                       json={"model": model, "temperature": 0.2, "response_format": {"type": "json_object"},
                             "messages": [{"role": "system", "content": PROMPT},
                                          {"role": "user", "content": json.dumps({"pontos": points, "respostas": respostas}, ensure_ascii=False)}]})
        r.raise_for_status()
        data = json.loads(r.json()["choices"][0]["message"]["content"])
        return data.get("points") if isinstance(data.get("points"), list) else None
    except Exception:
        log.warning("Análise MOE por modelo indisponível; usando mapeamento por cena")  # sem conteúdo
        return None


def conversations(snapshot: dict, answers: list[dict], dialogue: list[dict], points: list[dict]) -> list[dict]:
    """Cada troca com um personagem: o que ele disse, o que a pessoa respondeu e os pontos que a resposta tocou."""
    lines = {(d["scene_id"], d["turn"]): d for d in dialogue if d["speaker"] == "npc"}
    scenes = {s["id"]: s for s in snapshot["scenes"]}
    out = []
    for a in answers:
        scene = scenes.get(a["scene_id"], {})
        persona = snapshot["personas"].get(scene.get("persona_id", ""), {})
        npc = lines.get((a["scene_id"], a.get("turn", 0)))
        touched = [p["name"] for p in points if any(in_utterance(q, a["quote"]) for q in p["quotes"])]
        out.append({"persona": persona.get("name", ""), "role": persona.get("role", ""), "stage": scene.get("stage", ""),
                    "npc_line": npc["text"] if npc else scene.get("line", ""), "memory": bool(npc and npc.get("source") == "memoria"),
                    "follow_up": a.get("turn", 0) > 0, "quote": a["quote"], "points": touched})
    return out


def analyze(snapshot: dict, answers: list[dict], api_key: str = "", model: str = "", dialogue: list[dict] | None = None) -> dict:
    texts = [a["quote"] for a in answers]
    if wellbeing_alert(texts):
        return {"alert": True, "method": "none", "points": [], "notice": NOTICE, "conversations": []}
    proposal = llm(snapshot, answers, api_key, model) if api_key else None
    method, points = ("llm", validate(snapshot, answers, proposal)) if proposal is not None else ("mapeamento", mapping(snapshot, answers))
    return {"alert": False, "method": method, "points": points, "notice": NOTICE,
            "conversations": conversations(snapshot, answers, dialogue or [], points)}
