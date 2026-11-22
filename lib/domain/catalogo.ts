/**
 * Detalhes editoriais do catálogo. Os nomes vêm de src/catalogo.js (fonte de verdade do
 * validador); os textos foram transcritos de docs/framework_mapa_de_talentos.md.
 * Nenhuma categoria nova é criada aqui.
 */
import { DOMINIOS, CAMINHOS, TEMA_DOMINIO, AVISO_PADRAO } from '@/src/catalogo.js';

export { DOMINIOS, CAMINHOS, TEMA_DOMINIO, AVISO_PADRAO };

export const AVISO_DECISAO = 'A decisão sobre sua carreira é sua e da sua liderança.';

export interface DominioInfo { nome: string; numero: string; descricao: string }
export interface TemaInfo {
  nome: string;
  dominio: string;
  numero: number;
  essencia: string;
  noTrabalho: string;
  sinal: string;
  pergunta: string;
  brilha: string;
}

export const DOMINIO_INFO: Record<string, DominioInfo> = {
  'FAZER ACONTECER': { nome: 'FAZER ACONTECER', numero: '01', descricao: 'Como a pessoa entrega resultado.' },
  'LIDAR COM GENTE': { nome: 'LIDAR COM GENTE', numero: '02', descricao: 'Como a pessoa se relaciona.' },
  'PENSAR E CRIAR': { nome: 'PENSAR E CRIAR', numero: '03', descricao: 'Como a pessoa resolve e aprende.' },
  'FORÇA INTERIOR': { nome: 'FORÇA INTERIOR', numero: '04', descricao: 'Como a pessoa se sustenta.' },
};

const T = (
  nome: string, numero: number, essencia: string, noTrabalho: string, sinal: string, pergunta: string, brilha: string,
): TemaInfo => ({ nome, numero, dominio: TEMA_DOMINIO[nome], essencia, noTrabalho, sinal, pergunta, brilha });

export const TEMAS: TemaInfo[] = [
  T('Palavra Dada', 1, 'Você é alguém que cumpre o que promete. Quando assume algo, os outros podem relaxar.',
    'É a pessoa de quem a equipe depende para fechar o caixa, abrir a loja ou cobrir um turno.',
    'Conta que terminou algo mesmo sem ninguém cobrar, ou que se sentiu mal por atrasar.',
    'Me conta uma vez em que você assumiu uma coisa e levou até o fim.',
    'Funções de confiança, como abertura e fechamento de loja, tesouraria e controle de estoque.'),
  T('Mão na Massa', 2, 'Você é alguém que tem energia para fazer e não fica parado esperando.',
    'Puxa o ritmo e dá conta de picos de movimento.',
    'Usa muitos verbos de ação (“peguei e fiz”), fala de rotina intensa ou se incomoda com tempo parado.',
    'Como é para você um dia de muito movimento?',
    'Operação, reposição, logística e atendimento em horário de pico.'),
  T('Tudo no Lugar', 3, 'Você é alguém que traz ordem ao caos e cria um jeito certo de fazer as coisas.',
    'Organiza o estoque, a escala e o processo, e os outros passam a seguir o jeito dela.',
    'Descreve que arrumou, separou, criou uma lista ou padronizou algo.',
    'Já teve alguma coisa bagunçada no trabalho que você resolveu organizar?',
    'Estoque, almoxarifado, controle de processos e planejamento de escala.'),
  T('Olho Clínico', 4, 'Você é alguém que vê o detalhe que os outros deixam passar.',
    'Pega o erro antes de virar problema, como um preço errado, uma validade vencida ou um troco a mais.',
    'Conta que conferiu duas vezes, desconfiou de algo ou evitou um prejuízo.',
    'Me conta uma vez em que você percebeu um erro antes de todo mundo.',
    'Conferência, qualidade, auditoria de loja, recebimento de mercadoria e prevenção de perdas.'),
  T('Ponte', 5, 'Você é alguém que conecta pessoas e puxa conversa com facilidade.',
    'O cliente volta por causa dela, e ela conhece todo mundo da loja.',
    'Fala de muitas pessoas pelo nome, conta que fez amizade rápido ou que adora atender.',
    'Como você costuma se dar com cliente que você não conhece?',
    'Vendas, atendimento, recepção, integração de novatos e relacionamento com clientes.'),
  T('Porto Seguro', 6, 'Você é alguém que acolhe. As pessoas te procuram quando estão mal.',
    'Acalma o cliente nervoso e é procurada pelo colega com problema.',
    'Descreve o que o outro estava sentindo ou conta que parou para ajudar.',
    'Me conta uma vez em que alguém estava chateado e você ajudou.',
    'Pós-venda, trocas e reclamações, cuidado, treinamento e mediação.'),
  T('Time Junto', 7, 'Você é alguém que faz o grupo funcionar e prefere acordo a briga.',
    'Segura a equipe unida, divide tarefas e apaga incêndio entre colegas.',
    'Usa muito “a gente” e conta que ajudou a resolver um desentendimento.',
    'Quando a equipe se desentende, o que você costuma fazer?',
    'Equipes de turno, liderança de time, projetos coletivos e áreas com muita troca.'),
  T('Voz Firme', 8, 'Você é alguém que assume a frente, decide e convence.',
    'Quando o gerente não está, os outros olham para ela.',
    'Conta que tomou uma decisão, defendeu uma ideia ou liderou numa crise.',
    'Já aconteceu de você ter que tomar a frente de alguma situação?',
    'Liderança de turno, supervisão, vendas consultivas e negociação.'),
  T('Curiosidade Viva', 9, 'Você é alguém que aprende rápido e gosta de entender como as coisas funcionam.',
    'É a primeira a dominar o sistema novo e ensina os outros.',
    'Conta que aprendeu sozinha, assistiu vídeos ou perguntou até entender.',
    'Qual foi a última coisa que você aprendeu por conta própria?',
    'Funções técnicas, sistemas, treinamento e qualquer requalificação.'),
  T('Faísca', 10, 'Você é alguém que tem ideias e enxerga jeitos novos de fazer.',
    'Sugere a vitrine diferente, o atalho no processo ou a promoção criativa.',
    'Conta que inventou um jeito, sugeriu uma mudança ou fez algo bonito.',
    'Já teve alguma ideia que mudou o jeito de fazer alguma coisa no trabalho?',
    'Visual merchandising, marketing de loja, melhoria de processos e conteúdo.'),
  T('Topa o Novo', 11, 'Você é alguém que encara mudança sem drama.',
    'Aceita trocar de setor, de turno ou de sistema e se ajusta rápido.',
    'Já trocou de função, cidade ou área e conta isso de forma positiva.',
    'Como foi para você a última grande mudança no trabalho?',
    'Realocação, abertura de novas unidades, projetos piloto e coberturas.'),
  T('Desatador de Nós', 12, 'Você é alguém que resolve problemas e vai atrás da causa.',
    'Quando algo quebra ou trava, chamam essa pessoa.',
    'Descreve um problema, o que testou e como chegou na solução.',
    'Me conta um problema difícil que você resolveu.',
    'Manutenção, suporte, resolução de reclamações e operação técnica.'),
  T('Sangue Frio', 13, 'Você é alguém que mantém a calma quando tudo aperta.',
    'Fila enorme, sistema caído, cliente gritando, e ela continua funcionando.',
    'Conta uma situação de pressão com tranquilidade e descreve o que fez, não o que sentiu de ruim.',
    'Me conta o dia mais tenso que você já teve no trabalho.',
    'Horários de pico, emergências, caixa, segurança e atendimento de crise.'),
  T('Volta por Cima', 14, 'Você é alguém que erra, aprende e segue em frente.',
    'Não desmorona com bronca nem com um dia ruim, e volta melhor.',
    'Conta um erro ou fracasso e o que aprendeu com ele.',
    'Já errou feio em alguma coisa? O que aconteceu depois?',
    'Metas e vendas, funções com cobrança e qualquer começo em função nova.'),
  T('Paciência de Ouro', 15, 'Você é alguém que não perde a linha, mesmo quando provocado.',
    'Atende o cliente mais difícil do dia sem levar para o pessoal.',
    'Relata uma provocação e conta que respondeu com calma.',
    'Como você lida com um cliente grosseiro?',
    'Atendimento ao público, call center, cobrança e trocas.'),
  T('Bússola', 16, 'Você é alguém que faz o certo mesmo quando ninguém está olhando.',
    'Devolve o troco a mais, avisa do erro dela mesma e não entra em esquema.',
    'Conta um dilema e escolheu o caminho honesto, mesmo com custo.',
    'Já teve uma situação em que fazer o certo era mais difícil?',
    'Caixa, tesouraria, prevenção de perdas e funções de confiança.'),
];

export const TEMA_POR_NOME: Record<string, TemaInfo> = Object.fromEntries(TEMAS.map(t => [t.nome, t]));

export const CAMINHO_INFO: Record<string, { gosta: string; funcoes: string }> = {
  'Fazer com as mãos': { gosta: 'Construir, consertar, operar equipamentos e máquinas', funcoes: 'Manutenção, logística, produção, instalação' },
  'Entender e investigar': { gosta: 'Descobrir causas, analisar, mexer com dados', funcoes: 'Qualidade, análise, suporte técnico, prevenção de perdas' },
  'Criar e expressar': { gosta: 'Montar, decorar, comunicar, inventar', funcoes: 'Visual merchandising, conteúdo, design de loja, eventos' },
  'Cuidar e ensinar': { gosta: 'Ajudar, orientar, treinar pessoas', funcoes: 'Atendimento, treinamento, RH, integração de novatos' },
  'Liderar e vender': { gosta: 'Convencer, negociar, assumir a frente', funcoes: 'Vendas, liderança de turno, gerência, negociação' },
  'Organizar e controlar': { gosta: 'Planilha, rotina, conferência, ordem', funcoes: 'Estoque, administrativo, caixa, controle e escala' },
};
