# Office Experience — reutilização real do Pixel Agents

## Estado

> **Atualização (sprint MOE, branch `feat/moe-playable`):** o escritório agora é montado por uma entrada MOE própria (`office/moe-webview/`) que reaproveita o motor upstream sem alterá-lo, com Maia, Léo e Nara como personagens reais e o cenário S01 jogável. O build foi validado em localhost e em Preview Vercel. Detalhes, decisões e pendências em [`docs/moe/README.md`](moe/README.md). As seções abaixo descrevem o ponto de partida.

Este trabalho adiciona o **repositório original Pixel Agents como submódulo Git**, fixado no commit `4dd14d612fd37d89ffbbc977959f572395c4eec8` (2026-11-10), além de uma rota Next.js `/office` e script de build para o webview React/Canvas original.

**Não é uma reimplementação da pixel art.** Os sprites, personagens, mobiliário, tiles, renderer e animações são do projeto upstream. Ainda não são agentes de RH ligados à Agora. O webview original ainda carrega controles de agentes de programação e deverá ser adaptado após o primeiro build.

## Licença

Pixel Agents é MIT, copyright (c) 2026 Pablo De Lucca. Preservar `vendor/pixel-agents/LICENSE` e atribuição. O projeto [ChatDev](https://github.com/OpenBMB/ChatDev) é Apache-2.0, mas **não foi incorporado**. Não baixar/redistribuir pacotes gráficos externos cuja licença não esteja confirmada.

## Por que submódulo

O Pixel Agents é um projeto React/Vite organizado em `webview-ui`, `core`, `server` e `adapters` e não fornece uma biblioteca npm independente para embutir `OfficeCanvas` sem dependências. Submódulo versionado é o caminho mais rápido para reutilizar o renderer sem copiar centenas de arquivos e permite auditar alterações upstream.

A aplicação principal encontrada na branch `pontos-fortes` já usa Next.js e FastAPI. Esta branch de integração parte dela, não de `main`, para não destruir o frontend existente.

## Como construir

```bash
git clone --recurse-submodules https://github.com/Felici4no/mapa-de-talentos.git
cd mapa-de-talentos
git checkout feat/office-pixelagents-vendor
git submodule update --init --recursive
node scripts/build-office-visual.mjs
cd frontend
npm ci
npm run build
npm run dev
```

Abra `http://localhost:3000/office`.

O script instala dependências do Pixel Agents e constrói o webview, habilitando seu mecanismo de assets do modo de demonstração no build estático. As três alterações feitas temporariamente no código upstream são restauradas no `finally`.

### Vercel

**Importante:** não está deployado nem testado na Vercel. A branch deve ter um Preview com a submodule disponível no checkout. Executar, a partir da raiz do repositório:

```bash
git submodule update --init --recursive
node scripts/build-office-visual.mjs
cd frontend && npm ci && npm run build
```

No projeto Vercel, usar `frontend` como Root Directory pode impedir o comando de acessar `../vendor` ou `../scripts` dependendo da configuração do build. Nesse caso, configurar o Root Directory no repositório raiz e construir/copyar o frontend como saída, ou preparar os assets estáticos no CI e versioná-los de forma controlada. Não assumir que um deploy funcionou sem conferir o resultado.

## Limitações atuais

- O renderer carregado é o webview original, com conceitos ligados a agentes de programação. O modo mock inicial pode exibir um escritório vazio; personagens Maia/Léo/Nara devem ser conectados ao estado visual.
- A rota `/office` e o script existem; os assets compilados **não foram publicados nem verificados**.
- O build embutido é separado do backend de voz; falta integração de NPCs, turn-taking, transcrição e análise.
- O relatório deve identificar claramente respostas de simulação, nunca misturá-las com evidências autobiográficas.
- Não enviar dados pessoais por postMessage sem validação de origin e consentimento.

## Próxima implementação (Claude)

1. Executar o build e corrigir compatibilidade das dependências upstream.
2. Adicionar adapter para criar Maia, Léo e Nara como personagens reais em `OfficeState`, controlados pela máquina existente `src/office-experience/engine.js` (na branch `feat/office-experience`).
3. Adaptar UI removendo terminal, editor de escritório e controles não relacionados.
4. Expor eventos tipados para seleção de NPC, fala ativa, pausa e resposta do participante.
5. Integrar Agora com um orquestrador e vozes por personagem. Testar interrupções reais.
6. Incluir testes de UI e fazer Preview Vercel.

**Não mergear na main antes de validar o build**, e considerar juntar os PRs de forma consciente com a branch `pontos-fortes`.
