"""Catálogos da contratação por fit: soft skills, valores de cultura e perfil comportamental.

O perfil comportamental usa os 4 domínios do Mapa de Talentos (taxonomy.DOMAINS): a empresa diz quanto
cada domínio pesa na vaga (0 a 100) e a entrevista mostra onde a pessoa tem evidência.
Os sinais abaixo alimentam a análise de reserva quando não há analista de texto configurado.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Signal:
    id: str
    name: str
    hint: str
    signals: tuple[str, ...]


SOFT_SKILLS = (
    Signal("comunicacao", "Comunicação", "Explica com clareza e adapta a fala a quem ouve.",
           ("expliquei", "conversei", "apresentei", "deixei claro", "falei com", "alinhei", "comuniquei")),
    Signal("colaboracao", "Trabalho em equipe", "Divide o trabalho e ajuda o time a entregar junto.",
           ("a gente", "nossa equipe", "juntos", "ajudei", "dividimos", "o time", "colegas")),
    Signal("adaptabilidade", "Adaptabilidade", "Muda de plano sem perder o rumo quando o contexto muda.",
           ("mudou tudo", "me adaptei", "tive que mudar", "de repente", "imprevisto", "replanejei", "plano b")),
    Signal("resolucao", "Resolução de problemas", "Encontra a causa e resolve, em vez de contornar.",
           ("resolvi", "descobri", "a causa", "solucao", "consertei", "investiguei", "resolver")),
    Signal("pensamento-critico", "Pensamento crítico", "Questiona dados e premissas antes de decidir.",
           ("analisei", "comparei", "os dados", "questionei", "faz sentido", "conferi", "numeros")),
    Signal("lideranca", "Liderança", "Assume a frente, dá direção e desenvolve pessoas.",
           ("liderei", "coordenei", "assumi a frente", "organizei o time", "puxei", "orientei", "treinei")),
    Signal("empatia", "Empatia", "Entende o lado do outro e age a partir disso.",
           ("me coloquei no lugar", "entendi o lado", "percebi que ele", "percebi que ela", "escutei", "acolhi")),
    Signal("resiliencia", "Resiliência", "Segue em frente depois de erro, pressão ou perda.",
           ("nao desisti", "continuei", "levantei", "persisti", "mesmo assim", "insisti", "de novo")),
    Signal("organizacao", "Organização", "Planeja, prioriza e cumpre prazos.",
           ("planilha", "organizei", "planejei", "prioridade", "cronograma", "lista", "prazo")),
    Signal("criatividade", "Criatividade", "Propõe caminhos novos para problemas conhecidos.",
           ("tive a ideia", "inventei", "criei", "jeito novo", "diferente", "inovei", "testei")),
    Signal("negociacao", "Negociação", "Chega a acordos bons para os dois lados.",
           ("negociei", "acordo", "convenci", "proposta", "cheguei num meio", "argumentei")),
    Signal("autonomia", "Autonomia", "Toma iniciativa sem esperar instrução.",
           ("por conta propria", "ninguem pediu", "tomei a iniciativa", "fui atras", "decidi", "sozinho", "sozinha")),
    Signal("aprendizado", "Aprendizado contínuo", "Busca aprender e aplica o que aprende.",
           ("aprendi", "estudei", "curso", "pesquisei", "fui aprender", "vi um video", "li sobre")),
    Signal("foco-cliente", "Foco no cliente", "Parte da necessidade de quem é atendido.",
           ("cliente", "atendimento", "o usuario", "a pessoa precisava", "satisfeito", "reclamacao")),
)

CULTURE_VALUES = (
    Signal("colaboracao", "Colaboração", "Resultados são construídos em conjunto.",
           ("a gente", "juntos", "time", "equipe", "ajudei", "dividimos")),
    Signal("autonomia", "Autonomia e dono", "Cada pessoa age como dona do que faz.",
           ("assumi", "por conta propria", "fui atras", "tomei a iniciativa", "decidi", "responsabilidade")),
    Signal("cliente", "Cliente no centro", "As decisões partem de quem usa o produto.",
           ("cliente", "usuario", "atendimento", "satisfeito", "reclamacao")),
    Signal("inovacao", "Inovação", "Testar e criar caminhos novos é bem-vindo.",
           ("ideia", "testei", "criei", "jeito novo", "experimentei", "inovei")),
    Signal("transparencia", "Transparência", "Informação aberta e conversa franca.",
           ("fui sincero", "fui sincera", "falei a verdade", "abri o jogo", "transparente", "admiti")),
    Signal("excelencia", "Excelência", "Qualidade alta e cuidado com o detalhe.",
           ("detalhe", "caprichei", "qualidade", "conferi", "revisei", "bem feito")),
    Signal("aprendizado", "Aprendizado contínuo", "Errar, aprender e melhorar rápido.",
           ("aprendi", "erro", "errei", "melhorei", "feedback", "estudei")),
    Signal("agilidade", "Agilidade", "Decidir e entregar rápido, ajustando no caminho.",
           ("rapido", "na hora", "no mesmo dia", "agilizei", "corri", "prazo")),
    Signal("diversidade", "Diversidade e respeito", "Pessoas diferentes, todas respeitadas.",
           ("respeito", "diferente de mim", "cada um", "inclui", "acolhi", "ouvi todo mundo")),
    Signal("resultado", "Foco em resultado", "Metas claras e entrega mensurável.",
           ("meta", "resultado", "bati", "vendas", "numero", "entreguei")),
)

SOFT_SKILLS_BY_ID = {s.id: s for s in SOFT_SKILLS}
CULTURE_BY_ID = {c.id: c for c in CULTURE_VALUES}

# Peso de cada eixo no fit geral. Mostrado na interface como dica.
WEIGHTS = {"culture": 0.4, "profile": 0.3, "soft_skills": 0.3}
