"""Regras do MOE: catálogos, limites e o filtro de temas proibidos."""
import os
import re

from app.services.analysis import normalize

STANCES = {
    "colaborativa": "Busca acordo e oferece ajuda.",
    "direta": "Vai ao ponto, pede clareza e prazos.",
    "cetica": "Questiona premissas e pede justificativas.",
    "apressada": "Tem pouco tempo e cobra objetividade.",
    "acolhedora": "Valoriza como a pessoa está e escuta com calma.",
}
TONES = {
    "colaborativo": "Clima de parceria; ninguém está contra ninguém.",
    "neutro": "Clima profissional comum.",
    "tenso": "Prazo apertado e alguma frustração no ar, sem agressividade.",
}
VOICE_TONES = {
    "serena": "Fala pausada e calma.",
    "dinamica": "Fala rápida e animada.",
    "objetiva": "Frases curtas e diretas.",
    "calorosa": "Próxima, gentil, sorriso na voz.",
    "firme": "Segura, com pouca hesitação.",
}
PRESSURE = {1: "Sem pressa", 2: "Leve", 3: "Moderada", 4: "Alta", 5: "Crítica"}
# Perfis de personagem padrão do Pixel Agents (core/src/defaultCharacterProfiles.ts).
LOOKS = {0: "Suit", 1: "Dress", 2: "Spike", 3: "Aura", 4: "Tidy", 5: "Bob"}

MAX_POINTS_PER_TENANT = 30
MAX_PERSONAS_PER_TENANT = 20
MAX_SCENES, MAX_CAST = 6, 4
MAX_SIGNALS, MAX_TRAITS = 6, 5
MAX_ANSWER = 2000

# Mesmos limites da Lia: nunca explorar temas sensíveis nem atributos protegidos.
SENSITIVE = re.compile(
    r"\b(religi\w*|igreja\w*|politic\w*|partido\w*|orientacao sexual|sexualidade|gravid\w*|gestant\w*|"
    r"filhos?|familia\w*|casad[oa]s?|idade|raca|racial|etnia|cor da pele|deficien\w*|doenca\w*|saude|"
    r"nacionalidade|sotaque|naturalidade)\b")


def sensitive_terms(*texts: str) -> list[str]:
    found: list[str] = []
    for text in texts:
        found += [m.group(0) for m in SENSITIVE.finditer(normalize(text or ""))]
    return sorted(set(found))


def voice_catalog(tts_vendor: str, tts_voice: str) -> dict:
    """Vozes que podem ser atribuídas a personagens. Nunca inventa ids:
    - openai: as seis vozes publicadas do tts-1 (também as aceitas por services/agora.voice);
    - demais fornecedores: a voz configurada (TTS_VOICE_ID) + MOE_VOICE_CATALOG="id|rótulo,id|rótulo".
    """
    voices: list[dict] = []
    if tts_vendor == "openai":
        voices = [{"id": v, "label": v.capitalize()} for v in ("alloy", "echo", "fable", "onyx", "nova", "shimmer")]
    else:
        if tts_voice:
            voices.append({"id": tts_voice, "label": f"{tts_voice} (padrão)"})
        for item in filter(None, (s.strip() for s in os.environ.get("MOE_VOICE_CATALOG", "").split(","))):
            vid, _, label = item.partition("|")
            if vid and all(v["id"] != vid for v in voices):
                voices.append({"id": vid.strip(), "label": (label or vid).strip()})
    return {"vendor": tts_vendor, "voices": voices}
