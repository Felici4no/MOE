"""Framework do Mapa de Talentos (github.com/Felici4no/mapa-de-talentos).

16 talentos em 4 domínios, ligados a subdimensões do Big Five (IPIP, domínio público),
e 6 caminhos de interesse (modelo RIASEC). Nomes e textos não repetem o CliftonStrengths.
Não é teste psicológico validado; não decide contratação, demissão ou promoção.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Domain:
    id: str
    name: str
    question: str
    color: str


@dataclass(frozen=True)
class Theme:
    id: str
    name: str
    domain: str
    summary: str      # "Você é alguém que…"
    at_work: str
    question: str     # pergunta-chave da Lia
    base: str         # base científica (IPIP/Big Five)
    shines: str       # onde brilha
    signals: tuple[str, ...]  # sinais para o analisador de reserva


@dataclass(frozen=True)
class Path:
    id: str
    name: str
    likes: str
    roles: str
    signals: tuple[str, ...]


DOMAINS = (
    Domain("fazer", "Fazer Acontecer", "Como você entrega resultado?", "#c9321e"),
    Domain("gente", "Lidar com Gente", "Como você se relaciona?", "#157a52"),
    Domain("pensar", "Pensar e Criar", "Como você resolve e aprende?", "#2f5bea"),
    Domain("forca", "Força Interior", "Como você se sustenta?", "#b86e00"),
)

THEMES = (
    Theme("palavra-dada", "Palavra Dada", "fazer",
          "Você é alguém que cumpre o que promete. Quando assume algo, os outros podem relaxar.",
          "É a pessoa de quem a equipe depende para fechar o caixa, abrir a loja ou cobrir um turno.",
          "Me conta uma vez em que você assumiu uma coisa e levou até o fim.",
          "Senso de dever (conscienciosidade).", "Funções de confiança, abertura e fechamento, tesouraria, estoque.",
          ("assumi", "prometi", "levei ate o fim", "ninguem cobrou", "me senti mal por atrasar", "cumpri", "dei minha palavra")),
    Theme("mao-na-massa", "Mão na Massa", "fazer",
          "Você é alguém que tem energia para fazer e não fica parado esperando.",
          "Puxa o ritmo e dá conta de picos de movimento.",
          "Como é para você um dia de muito movimento?",
          "Nível de atividade e busca de realização.", "Operação, reposição, logística, atendimento em pico.",
          ("peguei e fiz", "fui la e fiz", "nao fico parad", "correria", "muito movimento", "dei conta", "pico")),
    Theme("tudo-no-lugar", "Tudo no Lugar", "fazer",
          "Você é alguém que traz ordem ao caos e cria um jeito certo de fazer as coisas.",
          "Organiza o estoque, a escala e o processo, e os outros passam a seguir esse jeito.",
          "Já teve alguma coisa bagunçada no trabalho que você resolveu organizar?",
          "Organização (conscienciosidade).", "Estoque, almoxarifado, controle de processos, escala.",
          ("organizei", "arrumei", "separei", "criei uma lista", "padronizei", "planilha", "cronograma", "etapas")),
    Theme("olho-clinico", "Olho Clínico", "fazer",
          "Você é alguém que vê o detalhe que os outros deixam passar.",
          "Pega o erro antes de virar problema: preço errado, validade vencida, troco a mais.",
          "Me conta uma vez em que você percebeu um erro antes de todo mundo.",
          "Cautela e deliberação (conscienciosidade).", "Conferência, qualidade, auditoria, recebimento, prevenção de perdas.",
          ("conferi", "percebi o erro", "estava errad", "desconfiei", "evitei prejuizo", "antes de dar prejuizo", "detalhe", "duas vezes")),
    Theme("ponte", "Ponte", "gente",
          "Você é alguém que conecta pessoas e puxa conversa com facilidade.",
          "O cliente volta por causa dessa pessoa, e ela conhece todo mundo.",
          "Como você costuma se dar com um cliente que você não conhece?",
          "Cordialidade e sociabilidade (extroversão).", "Vendas, atendimento, recepção, integração de novatos.",
          ("puxei conversa", "fiz amizade", "adoro atender", "conheco todo mundo", "cliente voltou", "gosto de gente")),
    Theme("porto-seguro", "Porto Seguro", "gente",
          "Você é alguém que acolhe. As pessoas te procuram quando estão mal.",
          "Acalma o cliente nervoso e é procurada pelo colega com problema.",
          "Me conta uma vez em que alguém estava chateado e você ajudou.",
          "Empatia e altruísmo (amabilidade).", "Pós-venda, trocas, reclamações, cuidado, treinamento, mediação.",
          ("estava chatead", "estava chorando", "fiquei com ela", "fiquei com ele", "acalmei", "parei para ajudar", "acolhi")),
    Theme("time-junto", "Time Junto", "gente",
          "Você é alguém que faz o grupo funcionar e prefere acordo a briga.",
          "Segura a equipe unida, divide tarefas e apaga incêndio entre colegas.",
          "Quando a equipe se desentende, o que você costuma fazer?",
          "Cooperação (amabilidade).", "Equipes de turno, liderança de time, projetos coletivos.",
          ("a gente", "dividimos", "desentendimento", "conversei com os dois", "acordo", "equipe unida")),
    Theme("voz-firme", "Voz Firme", "gente",
          "Você é alguém que assume a frente, decide e convence.",
          "Quando o gerente não está, os outros olham para essa pessoa.",
          "Já aconteceu de você ter que tomar a frente de alguma situação?",
          "Assertividade (extroversão).", "Liderança de turno, supervisão, vendas consultivas, negociação.",
          ("tomei a frente", "decidi", "liderei", "convenci", "defendi", "assumi o comando")),
    Theme("curiosidade-viva", "Curiosidade Viva", "pensar",
          "Você é alguém que aprende rápido e gosta de entender como as coisas funcionam.",
          "É a primeira a dominar o sistema novo e ensina os outros.",
          "Qual foi a última coisa que você aprendeu por conta própria?",
          "Intelecto e abertura a ideias.", "Funções técnicas, sistemas, treinamento, requalificação.",
          ("aprendi sozinh", "assisti video", "perguntei ate entender", "curso", "curiosidade", "ensinei os outros")),
    Theme("faisca", "Faísca", "pensar",
          "Você é alguém que tem ideias e enxerga jeitos novos de fazer.",
          "Sugere a vitrine diferente, o atalho no processo ou a promoção criativa.",
          "Já teve alguma ideia que mudou o jeito de fazer alguma coisa no trabalho?",
          "Imaginação e interesse estético (abertura).", "Visual merchandising, marketing, melhoria de processos, conteúdo.",
          ("tive a ideia", "inventei", "sugeri", "jeito novo", "deixei bonit", "criei")),
    Theme("topa-o-novo", "Topa o Novo", "pensar",
          "Você é alguém que encara mudança sem drama.",
          "Aceita trocar de setor, de turno ou de sistema e se ajusta rápido.",
          "Como foi para você a última grande mudança no trabalho?",
          "Gosto por novidade e flexibilidade (abertura).", "Realocação, novas unidades, projetos piloto, coberturas.",
          ("mudei de", "troquei de", "me adaptei", "sistema novo", "outra cidade", "gostei da mudanca")),
    Theme("desatador-de-nos", "Desatador de Nós", "pensar",
          "Você é alguém que resolve problemas e vai atrás da causa.",
          "Quando algo quebra ou trava, chamam essa pessoa.",
          "Me conta um problema difícil que você resolveu.",
          "Intelecto e senso de capacidade.", "Manutenção, suporte, resolução de reclamações, operação técnica.",
          ("resolvi", "consertei", "fui atras da causa", "testei", "descobri o problema", "travou")),
    Theme("sangue-frio", "Sangue Frio", "forca",
          "Você é alguém que mantém a calma quando tudo aperta.",
          "Fila enorme, sistema caído, cliente gritando, e a pessoa continua funcionando.",
          "Me conta o dia mais tenso que você já teve no trabalho.",
          "Estabilidade emocional.", "Horários de pico, emergências, caixa, segurança, atendimento de crise.",
          ("mantive a calma", "sistema caiu", "fila enorme", "anotando tudo", "nao me desesperei", "pressao")),
    Theme("volta-por-cima", "Volta por Cima", "forca",
          "Você é alguém que erra, aprende e segue em frente.",
          "Não desmorona com bronca nem com um dia ruim, e volta melhor.",
          "Já errou feio em alguma coisa? O que aconteceu depois?",
          "Estabilidade emocional e senso de capacidade.", "Metas, vendas, funções com cobrança, começos em função nova.",
          ("errei", "aprendi com", "dei a volta", "segui em frente", "levantei", "nao desisti")),
    Theme("paciencia-de-ouro", "Paciência de Ouro", "forca",
          "Você é alguém que não perde a linha, mesmo quando provocado.",
          "Atende o cliente mais difícil do dia sem levar para o pessoal.",
          "Como você lida com um cliente grosseiro?",
          "Controle da raiva (estabilidade emocional).", "Atendimento ao público, call center, cobrança, trocas.",
          ("cliente grosseir", "respondi com calma", "nao levei para o pessoal", "respirei", "nao perdi a linha")),
    Theme("bussola", "Bússola", "forca",
          "Você é alguém que faz o certo mesmo quando ninguém está olhando.",
          "Devolve o troco a mais, avisa do próprio erro e não entra em esquema.",
          "Já teve uma situação em que fazer o certo era mais difícil?",
          "Integridade (amabilidade).", "Caixa, tesouraria, prevenção de perdas, funções de confiança.",
          ("devolvi", "fiz o certo", "avisei do meu erro", "nao entrei", "honest", "o correto")),
)

PATHS = (
    Path("maos", "Fazer com as mãos", "Construir, consertar, operar equipamentos e máquinas",
         "Manutenção, logística, produção, instalação", ("consertar", "montar", "maquina", "equipamento", "com as maos")),
    Path("investigar", "Entender e investigar", "Descobrir causas, analisar, mexer com dados",
         "Qualidade, análise, suporte técnico, prevenção de perdas", ("descobrir", "analisar", "dados", "entender como")),
    Path("criar", "Criar e expressar", "Montar, decorar, comunicar, inventar",
         "Visual merchandising, conteúdo, design de loja, eventos", ("decorar", "criar", "inventar", "vitrine", "comunicar")),
    Path("cuidar", "Cuidar e ensinar", "Ajudar, orientar, treinar pessoas",
         "Atendimento, treinamento, RH, integração de novatos", ("ajudar", "ensinar", "treinar", "orientar", "cuidar")),
    Path("liderar", "Liderar e vender", "Convencer, negociar, assumir a frente",
         "Vendas, liderança de turno, gerência, negociação", ("vender", "negociar", "liderar", "convencer", "meta")),
    Path("organizar", "Organizar e controlar", "Planilha, rotina, conferência, ordem",
         "Estoque, administrativo, caixa, controle e escala", ("planilha", "rotina", "conferir", "organizar", "controle")),
)

THEMES_BY_ID = {theme.id: theme for theme in THEMES}
THEMES_BY_NAME = {theme.name: theme for theme in THEMES}
DOMAINS_BY_ID = {domain.id: domain for domain in DOMAINS}
PATHS_BY_NAME = {path.name: path for path in PATHS}

NOTICE = ("Este Mapa é uma ferramenta de autoconhecimento e desenvolvimento, não um teste psicológico. "
          "As decisões de carreira são suas e da sua liderança.")
CLOSING = "Terminamos nossa conversa. Seu Mapa de Talentos está sendo preparado."
