# Claude Code — Sprint MOE: simulação local e Vercel Preview

**MISSÃO: implementar e demonstrar, não só documentar.**

Você é responsável pela integração full-stack e pela experiência visual de **MyOfficeExperience (MOE)**. Temos pouco tempo. Parta de código existente. O produto precisa abrir **um escritório 2D real**, permitir executar uma simulação até o fim e publicar um **Preview Vercel** acessível. Não crie pixel art, renderer nem engine do zero.

## Repositório e branches

- Repo: `https://github.com/Felici4no/mapa-de-talentos`.
- Base visual da feature: `feat/office-pixelagents-vendor`, que deriva de `pontos-fortes` e está no PR #4. Use esta branch como ponto de partida e, se necessário, crie `feat/moe-playable`.
- `vendor/pixel-agents` é submódulo Git do upstream [pixel-agents-hq/pixel-agents](https://github.com/pixel-agents-hq/pixel-agents), fixado no commit `4dd14d612fd37d89ffbbc977959f572395c4eec8` (MIT, Pablo De Lucca).
- O motor de cenário em `src/office-experience/scenarios.js` e `engine.js` está no PR #2 / branch `feat/office-experience` (base main). Traga **somente os arquivos de domínio necessários**, evitando merge cego ou perda do frontend da branch `pontos-fortes`.
- Leia `docs/moe-brand.md`, `docs/pixel-agents-integration.md`, `docs/arquitetura.md`, `README.md` e ambos os PRs antes de editar.
- Não sobrescreva a aplicação Next.js/FastAPI já existente em `pontos-fortes`. Preserve rotas, APIs, banco e configurações atuais.

## Objetivo de UX

**MOE / MyOfficeExperience** — "Entre no escritório. Converse. Decida. Reflita."

1. Acesso por `/moe` (manter `/office` como redirecionamento).
2. Tela inicial com marca MOE e convite `ENTRAR NO ESCRITÓRIO`.
3. Escritório original do Pixel Agents renderizado no navegador, com móveis, pisos, sprites e personagens reais.
4. Personagens visíveis: Maia (gestora), Léo (colega), Nara (cliente interno).
5. Aproximação/clique em NPC ou progressão clara por cenas; exibir nome, cargo, fala e estado de voz.
6. Uma situação demonstrável: `S01 — Entrega sob pressão`, três turnos curtos. Resposta em texto sempre funciona; voz real opcional se Agora estiver pronto.
7. Tela final `Sua experiência no escritório`, com as **frases literais do participante**, identificadas como simulação. Não atribuir nota de contratação nem reutilizar essas respostas como evidências de trabalho real no Mapa de Talentos.
8. Botões `Sair`, `Repetir`, `Silenciar`, `Recomeçar` e fallback em caso de falha.

## Reaproveitamento técnico obrigatório

O Pixel Agents tem `webview-ui/src/office/components/OfficeCanvas.tsx`, `office/engine/officeState.ts`, `office/engine/gameLoop.ts`, `office/engine/renderer.ts`, sprite sheets, layout do escritório e `webview-ui/src/browserMock.ts`. **Inspecione como o estado real gera personagens** (por exemplo `OfficeState.addAgent`) e use a infraestrutura de Canvas/sprites existente.

O código upstream nasceu para agentes de programação em VS Code e modo standalone. Uma cópia do site original em iframe com terminais e botões de desenvolvimento **não atende ao objetivo**. O adaptador deve substituir esses comportamentos por NPCs da nossa simulação.

A implementação já começou com um script em `scripts/build-office-visual.mjs`. Execute-o e corrija eventuais erros. Ele pode precisar de ajustes em asset paths, modo mock no build estático, submódulo Git, `VITE_OFFICE_DEMO` e Vercel. É uma base a validar, não algo presumidamente pronto.

**Preferência de implementação:** alterar somente uma camada fina de entrada/shell no webview, mantendo renderer e engine upstream. Criar `MoeOfficeBridge` com mensagens tipadas entre Next.js e webview, ou extração seletiva dos módulos se for mais simples. Isolar alterações upstream, atribuição MIT e dependências. Não colocar credenciais no iframe. Usar `postMessage` somente com `origin` e schema verificados.

## Fluxo demonstrativo prioritário

Cenário S01, aproximadamente 2–3 minutos:

**Maia / Gestora:** "Temos uma entrega hoje e apareceram tarefas inesperadas. Como você começaria a organizar as prioridades?"
O participante responde.

**Léo / Colega:** "Estou com uma tarefa atrasada e preciso de ajuda. Como você prefere que a gente resolva?"
O participante responde.

**Nara / Cliente interno:** "Preciso atualizar a equipe. O que você pode me contar sobre a situação?"
O participante responde.

O motor deve avançar `briefing → colega → atualizacao → concluida`. Registrar respostas de forma separada, com `speaker=participant`, `origin=office_simulation`, `scenario_id` e `scene_id`. Respostas de NPC **nunca** viram evidências da pessoa.

Para demo sem LLM, os diálogos de NPC são roteirizados e claramente fictícios. Se houver LLM, usá-lo apenas para pequenas reações contextuais, sem deixar que altere os critérios de avanço ou a lógica de privacidade. Mantenha uma única voz falando por vez.

## Voz (Agora)

Priorizar uma experiência natural de voz se a integração Agora existente na branch `pontos-fortes` permitir reaproveitamento.

- Inspecionar `frontend/src/lib/useInterviewRoom.ts` e `backend/app/services/agora.py` antes de criar um segundo cliente.
- Criar camada `useMoeVoice` ou adapter de turnos reutilizando autenticação, gerenciamento de sessão, microfone e reconexão existentes.
- Personagens usam perfis de voz distintos `maia`, `leo`, `nara` mapeados para vozes **suportadas de verdade** pelo provedor/configuração disponível. Não inventar voice IDs.
- Ativar personagem atual, falar, ouvir resposta, transcrever e avançar cena. Interrupção, permissão de microfone, limite de sessão e reconexão devem ser tratados.
- Se a capacidade de alterar voz por personagem não estiver disponível, documente a limitação e use uma voz integrada + texto/identidade distinta. Não simule uma integração concluída.
- Se faltarem credenciais, modo texto completamente jogável, com marcação `DEMO SEM VOZ`.

## Design

Identidade MOE: editorial, neobrutalista, tipografia monumental, ASCII como separador/interface de status, linhas pretas, amarelo como sinalização, fundos claros e bordas retas. Respeitar o design system que já existe no frontend — se sua paleta divergir da proposta, adaptar sem reescrever todo o app.

O interior do escritório deve manter a pixel art original do Pixel Agents. Não usar imagens geradas como substitutos para sprites funcionais. Interface responsiva, teclado, legendas, botões grandes e preferência por movimento reduzido.

**Créditos visíveis:** `Visual engine: Pixel Agents — MIT © 2026 Pablo De Lucca`. Preservar o aviso completo no submódulo e na distribuição.

## Execução local — OBRIGATÓRIA

Trabalhe até ter uma demo funcional, comprovada por teste local.

1. Verificar versões Node/npm e instalar dependências com lockfile.
2. `git submodule update --init --recursive`.
3. Construir webview de Pixel Agents conforme `scripts/build-office-visual.mjs`; corrigir asset index, bundle, URL relativa e mock de produção.
4. Testar APIs e dependências reais de Next.js e FastAPI caso a tela as use.
5. Executar `npm test` na raiz e os testes de frontend/backend aplicáveis; instalar só o necessário.
6. `cd frontend && npm ci && npm run build && npm run dev`.
7. Abrir `http://localhost:3000/moe` usando browser/Playwright (não apenas curl). Confirmar que a cena aparece, que sprites carregam, que os três personagens podem falar/responder em texto e que o usuário chega ao resultado.
8. Rodar teste Playwright de início → turno Maia → turno Léo → turno Nara → resultado. Conferir no console e network se há 404, exceções ou erros de assets.
9. Fazer pelo menos uma captura da página no estado de simulação e outra da devolutiva, sem incluir informações pessoais.

Se algo falhar, corrigir antes de considerar a etapa concluída.

## Vercel Preview — OBRIGATÓRIO

Depois que a versão local passar, publicar **Preview**, não produção. Não alterar domínio principal nem fazer promoção automática.

- Inspecionar a conta, projeto e equipe Vercel disponíveis; pedir conexão/credenciais só se forem realmente necessárias. Nunca imprimir segredos.
- O app Next.js está em `frontend/`, enquanto o submódulo e o script de build estão na raiz. Configurar corretamente o monorepo para que o build Vercel tenha acesso aos dois, ou criar uma estratégia robusta que compile o escritório na CI e entregue assets à aplicação.
- Validar o acesso ao submódulo na Vercel. Se o checkout não fizer init, usar passo de build explícito.
- Não confiar em `NEXT_PUBLIC_` para segredos; API keys da Agora, LLM ou Resend são exclusivamente server-side.
- Para backend FastAPI existente, verificar dependência operacional: Vercel pode hospedar apenas o frontend se a API rodar em outro lugar, e `next.config.ts` já tem regras de proxy de desenvolvimento. Não fingir que a API está acessível na produção.
- Fazer deploy do commit da feature e obter URL real de Preview.
- Validar `/moe` e o fluxo completo no domínio Vercel, inclusive carregamento de sprites, layout mobile e final da simulação.
- Reportar o deployment ID, status, commit e URL. Se houver bloqueio, apresentar o motivo exato, logs e comandos necessários. Não inventar URL ou marcar como READY sem retorno do provedor.

## Critérios de aceite

- [ ] Marca MOE em todas as telas desse modo.
- [ ] Ambiente 2D do **Pixel Agents real** aparece em localhost.
- [ ] Três NPCs visíveis, com nome e papel.
- [ ] Simulação S01 completada com três respostas próprias.
- [ ] Resultado com citações literais e rótulo `simulação fictícia`.
- [ ] Sem mistura com os talentos da entrevista Lia.
- [ ] Editor, terminal e funcionalidades de agentes de código removidos/ocultos da experiência MOE.
- [ ] Browser console sem exceções e assets sem 404.
- [ ] `npm test` / build / E2E executados, com resultados registrados.
- [ ] Preview Vercel acessível e testado ou bloqueio documentado.
- [ ] Licença e créditos originais preservados.
- [ ] PR de feature criado/atualizado, sem merge automático.

## Entregáveis ao final da sua execução

1. URL localhost/porta real usada e instruções de reprodução.
2. URL de Preview Vercel verificada e commit exato, se implantado.
3. Capturas de interface local e Preview.
4. Relatório dos testes efetivamente executados.
5. O que é voz real versus fallback textual.
6. Decisões de integração visual e alterações upstream.
7. Próximo passo técnico de maior impacto.

**Não comece uma nova landing, login, cadastro ou painel empresarial. MOE jogável é a prioridade absoluta desta sprint.**
