/**
 * Diálogos fictícios. Vozes são identificadores abstratos até existir um
 * provedor integrado e verificado.
 */
export const PERSONAGENS = Object.freeze({
  maia: { id: 'maia', nome: 'Maia', funcao: 'Gestora', voiceProfile: 'serena' },
  leo: { id: 'leo', nome: 'Léo', funcao: 'Colega', voiceProfile: 'dinamica' },
  nara: { id: 'nara', nome: 'Nara', funcao: 'Cliente interno', voiceProfile: 'objetiva' },
});

export const CENARIOS = Object.freeze({
  'entrega-sob-pressao': {
    id: 'entrega-sob-pressao',
    codigo: 'S01',
    titulo: 'Entrega sob pressão',
    descricao: 'Uma simulação fictícia de colaboração em um escritório.',
    cenas: [
      {
        id: 'briefing',
        npcId: 'maia',
        fala: 'Temos uma entrega hoje e apareceram tarefas inesperadas. Como você começaria a organizar as prioridades?',
        alternativas: ['Entender primeiro o que é urgente', 'Conversar com o time', 'Pedir mais contexto'],
      },
      {
        id: 'colega',
        npcId: 'leo',
        fala: 'Estou com uma tarefa atrasada e preciso de ajuda. Como você prefere que a gente resolva?',
        alternativas: ['Entender o bloqueio', 'Dividir as tarefas', 'Negociar o prazo'],
      },
      {
        id: 'atualizacao',
        npcId: 'nara',
        fala: 'Preciso atualizar a equipe. O que você pode me contar sobre a situação?',
        alternativas: ['Explicar o que já foi feito', 'Apontar riscos e próximos passos', 'Propor uma breve reunião'],
      },
    ],
  },
});
