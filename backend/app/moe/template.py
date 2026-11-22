"""Modelo inicial que a empresa pode clonar e flexionar: S01 — Entrega sob pressão."""

POINTS = [
    {"key": "priorizacao", "name": "Priorização", "weight": 4,
     "description": "Como a pessoa decide o que fazer primeiro quando tudo parece urgente.",
     "signals": ["Separa o urgente do importante", "Pede ou busca contexto antes de decidir", "Explicita critérios"]},
    {"key": "colaboracao", "name": "Colaboração", "weight": 3,
     "description": "Como a pessoa trabalha junto quando alguém do time está travado.",
     "signals": ["Pergunta pelo bloqueio antes de propor", "Divide tarefas", "Combina próximos passos"]},
    {"key": "comunicacao", "name": "Comunicação de status", "weight": 3,
     "description": "Como a pessoa informa andamento, riscos e próximos passos.",
     "signals": ["Diz o que já foi feito", "Aponta riscos", "Propõe próximos passos ou prazos"]},
]

PERSONAS = [
    {"key": "maia", "name": "Maia", "role": "Gestora", "look": 1, "stance": "direta", "voice_tone": "serena",
     "traits": ["organizada", "calma sob pressão"],
     "speaking_style": "Frases curtas, tom calmo, sempre fecha com uma pergunta aberta."},
    {"key": "leo", "name": "Léo", "role": "Colega", "look": 2, "stance": "colaborativa", "voice_tone": "dinamica",
     "traits": ["prestativo", "um pouco ansioso"],
     "speaking_style": "Fala rápido, admite quando está travado, pede ajuda com sinceridade."},
    {"key": "nara", "name": "Nara", "role": "Cliente interno", "look": 3, "stance": "apressada", "voice_tone": "objetiva",
     "traits": ["exigente", "justa"],
     "speaking_style": "Vai direto ao ponto e quer saber riscos e prazos."},
]

SCENARIO = {
    "title": "Entrega sob pressão",
    "description": "Uma entrega para hoje, tarefas inesperadas e um colega travado.",
    "pressure": 3, "tone": "neutro",
    "scenes": [
        {"id": "briefing", "persona": "maia", "points": ["priorizacao"],
         "line": "Temos uma entrega hoje e apareceram tarefas inesperadas. Como você começaria a organizar as prioridades?"},
        {"id": "colega", "persona": "leo", "points": ["colaboracao"],
         "line": "Estou com uma tarefa atrasada e preciso de ajuda. Como você prefere que a gente resolva?"},
        {"id": "atualizacao", "persona": "nara", "points": ["comunicacao"],
         "line": "Preciso atualizar a equipe. O que você pode me contar sobre a situação?"},
    ],
}
