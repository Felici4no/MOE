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
           ("expliquei", "conversei", "apresentei", "deixei claro", "falei com", "alinhei", "comuniquei", "atualiz", "status", "aviso", "avisar", "trazer o problema")),
    Signal("colaboracao", "Trabalho em equipe", "Divide o trabalho e ajuda o time a entregar junto.",
           ("a gente", "nossa equipe", "juntos", "ajudei", "dividimos", "o time", "colegas")),
    Signal("adaptabilidade", "Adaptabilidade", "Muda de plano sem perder o rumo quando o contexto muda.",
           ("mudou tudo", "me adaptei", "tive que mudar", "de repente", "imprevisto", "replanejei", "plano b")),
    Signal("resolucao", "Resolução de problemas", "Encontra a causa e resolve, em vez de contornar.",
           ("resolvi", "descobri", "a causa", "solucao", "consertei", "investiguei", "resolver")),
    Signal("pensamento-critico", "Pensamento crítico", "Questiona dados e premissas antes de decidir.",
           ("analisei", "comparei", "os dados", "questionei", "faz sentido", "conferi", "numeros", "risco", "por cento", "medir")),
    Signal("lideranca", "Liderança", "Assume a frente, dá direção e desenvolve pessoas.",
           ("liderei", "coordenei", "assumi a frente", "organizei o time", "puxei", "orientei", "treinei", "meu plano", "recomendo")),
    Signal("empatia", "Empatia", "Entende o lado do outro e age a partir disso.",
           ("me coloquei no lugar", "entendi o lado", "percebi que ele", "percebi que ela", "escutei", "acolhi")),
    Signal("resiliencia", "Resiliência", "Segue em frente depois de erro, pressão ou perda.",
           ("nao desisti", "continuei", "levantei", "persisti", "mesmo assim", "insisti", "de novo")),
    Signal("organizacao", "Organização", "Planeja, prioriza e cumpre prazos.",
           ("planilha", "organizei", "planejei", "prioridade", "cronograma", "lista", "prazo")),
    Signal("criatividade", "Criatividade", "Propõe caminhos novos para problemas conhecidos.",
           ("tive a ideia", "inventei", "criei", "jeito novo", "diferente", "inovei", "testei")),
    Signal("negociacao", "Negociação", "Chega a acordos bons para os dois lados.",
           ("negociei", "acordo", "convenci", "proposta", "proponho", "cheguei num meio", "argumentei", "em troca", "adiar")),
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

HARD_SKILLS = (
    Signal("roadmap", "Priorização de roadmap", "Ordena o backlog por valor, esforço e risco.",
           ("roadmap", "prioriz", "backlog", "rice", "valor e esforco", "o que entra", "fica de fora", "trade", "adiar", "proxima sprint", "em vez de")),
    Signal("metricas", "Métricas de produto", "Define como medir sucesso e acompanha os números.",
           ("metrica", "kpi", "indicador", "conversao", "churn", "retencao", "nps", "okr", "medir", "taxa de")),
    Signal("requisitos", "Escrita de requisitos", "Transforma o problema em histórias e critérios de aceite.",
           ("historia de usuario", "user story", "criterio de aceite", "criterios de aceite", "requisito", "especific", "escopo", "mvp")),
    Signal("discovery", "Discovery", "Valida problema e solução com usuários antes de construir.",
           ("discovery", "entrevista com", "pesquisa", "hipotese", "validar", "prototipo", "teste a b", "experimento")),
    Signal("dados", "Análise de dados", "Usa dados para decidir: SQL, painéis, planilhas.",
           ("sql", "dados", "dashboard", "painel", "planilha", "analisei", "query", "base de")),
    Signal("agil", "Métodos ágeis", "Trabalha em ciclos curtos com o time: sprint, refinamento, retro.",
           ("sprint", "scrum", "kanban", "refinamento", "planning", "retro", "daily")),
    Signal("negocio", "Visão de negócio", "Liga o produto a receita, custo e estratégia.",
           ("receita", "custo", "margem", "roi", "business case", "contrato", "faturamento", "mrr", "milhao", "milhoes", "reais")),
    Signal("tecnico", "Noções técnicas", "Conversa de igual para igual sobre API, arquitetura e dívida técnica.",
           ("api", "arquitetura", "divida tecnica", "integracao", "gateway", "deploy", "migracao", "banco de dados")),
)

SOFT_SKILLS_BY_ID = {s.id: s for s in SOFT_SKILLS}
HARD_SKILLS_BY_ID = {h.id: h for h in HARD_SKILLS}
CULTURE_BY_ID = {c.id: c for c in CULTURE_VALUES}

# Peso de cada eixo no fit geral. Mostrado na interface como dica.
WEIGHTS = {"culture": 0.3, "profile": 0.2, "soft_skills": 0.25, "hard_skills": 0.25}
AXIS_LABEL = {"culture": "Cultura", "profile": "Perfil", "soft_skills": "Soft skills", "hard_skills": "Hard skills"}

# Domínio comportamental (Mapa de Talentos) que cada item evidencia, para o perfil da reserva sem IA.
DOMAIN_OF = {
    "comunicacao": "gente", "colaboracao": "gente", "lideranca": "gente", "empatia": "gente", "negociacao": "gente",
    "foco-cliente": "gente",
    "organizacao": "fazer", "autonomia": "fazer", "roadmap": "fazer", "requisitos": "fazer", "agil": "fazer",
    "pensamento-critico": "pensar", "resolucao": "pensar", "criatividade": "pensar", "aprendizado": "pensar",
    "metricas": "pensar", "dados": "pensar", "discovery": "pensar", "tecnico": "pensar", "negocio": "pensar",
    "resiliencia": "forca", "adaptabilidade": "forca",
}
