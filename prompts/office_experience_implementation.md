# Prompt de implementação — Office Experience

Leia `docs/office-experience.md`, `docs/arquitetura.md`, `prompts/prompts_mapa_de_talentos.md` e o validador antes de implementar.

Você é um engenheiro full-stack e game interaction designer. Adicione a **Office Experience**, modo opcional de simulação de trabalho em pixel art, sem substituir a entrevista de voz da Lia.

## Objetivos visuais
- Escritório 2D top-down ou isométrico leve, pixel art original e câmera fixa, lembrando simuladores com personagens caminhando, mesas e balões de fala.
- Manter o design system editorial neobrutalista (papel, preto, amarelo e tipografia definida na landing). Pixel art apenas no escritório; ASCII em loading, capítulos, metadados e relatório.
- NPCs Maia (gestora), Léo (colega) e Nara (cliente interno), com sprites e vozes diferentes quando integrados. Personagens com nome, função e legenda.
- Layout acessível e responsivo, modo texto, áudio opcional, controle de fala, pausa, saída e replay.
- Personagens nunca falam todos ao mesmo tempo; usar orquestrador explícito de turnos.

## Escopo da primeira entrega
1. Implementar rota `/office` e convite de entrada opcional.
2. Consumir `src/office-experience/scenarios.js` e `engine.js`; não duplicar lógica de estado na interface.
3. Construir S01 com três situações, permitindo respostas de texto e alternativas (fallback) para demo.
4. Ao final, exibir resumo "O que você experimentou", com falas literais do participante e indicação de que se trata de simulação.
5. Preservar separação dos relatórios: NÃO alimentar `src/validar-relatorio.js` com falas da simulação como se fossem histórias reais.
6. Criar interface de adaptação para Agora com contratos de `start`, `stop`, `speak`, `onTranscript`, `onError`; implementar somente o que for possível verificar com APIs reais. Sem credenciais, manter demo textual identificada, nunca simular voz integrada.
7. Criar testes para completar cenário, ação inválida, sessão encerrada e isolamento das falas de NPC.
8. Escrever instruções no README e gerar deploy Preview Vercel, se houver permissões.

## Guardrails
- Simulação não é teste psicológico, não ranqueia trabalhadores e não indica contratação/promoção/demissão.
- Não inferir caráter, transtornos, inteligência ou competência pela velocidade de fala, sotaque, forma de escrever ou hesitação.
- Consentimento explícito para voz; possibilidade de sair e apagar.
- Não copiar sprites, áudio ou ativos de Pixel Agents / ChatDev sem conferir licença.

## Entrega
Abra PR para `main` com evidências dos testes. Priorize cena jogável e experiência real de voz apenas depois da base estável. Documente tarefas não concluídas, sem alegar integração funcional prematuramente.
