# MOE / MyOfficeExperience — sprint "simulação local + Vercel Preview"

Estado: **jogável em localhost e no Preview Vercel**, em modo texto (`DEMO SEM VOZ`). Escritório 2D é o **Pixel Agents original** (motor, sprites, móveis, layout e animações), sem pixel art nova.

## Como reproduzir

```bash
git clone --recurse-submodules https://github.com/Felici4no/mapa-de-talentos.git
cd mapa-de-talentos && git checkout feat/moe-playable
git submodule update --init --recursive
npm test                                  # 20 testes da raiz (validador, motor S01, protocolo)
cd frontend && npm ci
npm run build                             # prebuild compila o escritório (scripts/build-office-visual.mjs)
npx next start -p 3000                    # http://localhost:3000/moe   (/office redireciona)
npx playwright install chromium && npm run test:e2e
```

E2E contra um Preview protegido: `MOE_BASE_URL=<preview> MOE_SHARE_URL=<link _vercel_share> npm run test:e2e`.

## Fluxo

`/moe` → **VOCÊ CHEGOU AO ESCRITÓRIO.** → `ENTRAR NO ESCRITÓRIO` → escritório com Maia (Gestora), Léo (Colega) e Nara (Cliente interno) → três turnos `briefing → colega → atualizacao → concluida` → **Sua experiência no escritório** com as frases literais, marcadas como `SIMULAÇÃO FICTÍCIA` e separadas do Mapa de Talentos. Controles: Silenciar, Recomeçar, Sair, Repetir; fallback "Continuar só com texto" se o escritório não carregar em 20 s.

## Arquitetura

```
office/moe-webview/            entrada MOE do escritório (fonte nossa, fora do submódulo)
  main.tsx, MoeOffice.tsx      reaproveita OfficeState, OfficeCanvas, renderer, perfis, browserMock
  protocol.ts                  MoeOfficeBridge: mensagens tipadas + parsers (fonte única, host e iframe)
  hostBridge.ts                postMessage só para o pai de mesma origem; valida origin, source e esquema
  moe.css                      index.css upstream + @source para o Tailwind ver as classes upstream
  vite.moe.config.ts           build Vite com os plugins do upstream; gera JSON decodificado estático
scripts/build-office-visual.mjs  copia a entrada para webview-ui/moe/ (temporário), builda, remove; não edita o upstream
frontend/public/office-engine/   saída do build (ignorada no git) + LICENSE-pixel-agents.txt
src/office-experience/         motor de cenários do PR #2 (engine.js, scenarios.js) + tipos
frontend/src/components/moe/   telas MOE (entrada, escritório, devolutiva)
frontend/src/lib/moe/          useOfficeBridge (host), voice.ts (estado de voz declarado)
```

**Decisões de integração visual**
- Nenhum arquivo do submódulo é alterado (o script antigo fazia patch temporário em 3 arquivos; foi substituído). `vendor/pixel-agents` segue fixado em `4dd14d6`.
- NPCs entram pelo protocolo do próprio upstream (`agentCreated`, `agentStatus`): quem fala fica "ativo" (animação de trabalho na mesa); quem escuta recebe o balão de espera. Uma voz por vez.
- `import.meta.env.DEV` é definido no build MOE para ativar o caminho "navegador sem servidor" (browserMock + ponte do transporte) sem abrir WebSocket. Só `browserMock.ts` e `transport/index.ts` leem essa flag no que é importado.
- Enquadramento: zoom inteiro (pixel-perfect) e pan calculados sobre os tiles construídos (ignora VOID); sem câmera seguindo personagem.
- Terminal, editor de layout, cards, rádio, roster, conversas e usage bars **não são montados**.
- O protocolo só carrega ids de NPC e flags; respostas do participante nunca entram no iframe nem saem do navegador.

## Voz

| Item | Estado |
| --- | --- |
| Agora | **Não integrada nesta sprint.** Não há `AGORA_APP_ID/CERTIFICATE`, LLM nem TTS configurados, e o Preview hospeda só o frontend (o FastAPI não está publicado). |
| Interface | Modo texto completo, identificado como `DEMO SEM VOZ` em todas as telas. |
| Perfis | `maia/serena`, `leo/dinâmica`, `nara/objetiva` em `frontend/src/lib/moe/voice.ts`, **sem** IDs de voz (nenhum foi inventado). |
| Caminho | Reutilizar `useInterviewRoom` (RTC, microfone, reconexão) e `backend/app/services/agora.py` (`voice()` já escolhe TTS Microsoft/OpenAI/MiniMax). Por personagem: uma sessão de agente por NPC ou troca de TTS por turno — verificar o que o provedor suporta antes de prometer vozes distintas. |

## Vercel

- Projeto `mapa-de-talentos` (equipe `felici4nos-projects`). **Produção não foi alterada** (continua o deploy anterior).
- O app vive em `frontend/` mas precisa do submódulo e de `src/`/`office/` da raiz. Sem mudar o Root Directory do projeto (afetaria outras branches e a produção), esta branch usa `vercel.json` com `builds: @vercel/next` em `frontend/package.json` e uma rota que mapeia `/*` para o app montado.
- Build **remoto** na Vercel: instala o submódulo (`npm ci --include=dev`, pois a Vercel usa `NODE_ENV=production`), compila o escritório e o Next. `.vercelignore` exclui `node_modules`, backend e saídas locais.
- `vercel build` local não funciona neste Windows (EPERM ao criar symlinks sem Modo de Desenvolvedor).
- Deploys automáticos via Git estão **desligados** para `feat/moe-playable` e `feat/office-pixelagents-vendor` (o projeto builda a raiz por padrão). Preview desta sprint foi feito pela CLI.
- Previews têm Vercel Authentication. A barra da Vercel injetada em Previews faz um `OPTIONS /` que retorna 400; não vem do app (os testes enviam `x-vercel-skip-toolbar`).

## Pendências

1. Voz real (Agora + TTS por personagem), com teste de interrupção, permissão de microfone e reconexão.
2. Decidir a configuração definitiva do projeto Vercel quando `pontos-fortes` for para a `main` (Root Directory `frontend` substituiria o `builds` legado) e reativar deploys Git.
3. Rótulos de nome podem se sobrepor quando os NPCs ficam lado a lado no celular.
4. Backend FastAPI não foi testado nesta sprint (não é usado pelo MOE; `pytest` indisponível no ambiente).
5. Testes de UI com pessoas reais e revisão de acessibilidade com leitor de tela no iframe.
