# Frontend — documentação técnica de continuidade (Fase 1)

Aplicação Next.js (App Router) que dá forma visual e funcional ao domínio já existente em `src/`. O validador (`src/validar-relatorio.js`) e o catálogo (`src/catalogo.js`) **não foram alterados**: todo documento exibido, impresso ou enviado nasce de `validarRelatorio()`.

## Executar

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # 8 testes do validador + 60 testes Vitest
npm run lint && npm run typecheck
npm run build
npx playwright install chromium && npm run test:e2e   # requer build
node scripts/capturas.mjs http://localhost:3000 docs/capturas
```

Node 20+. Variáveis em `.env.example` — **todas opcionais**: sem elas, a aplicação roda inteira em modo demonstração, identificado na interface.

## Rotas

| Rota | Tipo | O que faz |
| --- | --- | --- |
| `/` | estática | Landing: hero, manifesto, método, 16 talentos, prévia do documento, confiança, CTA |
| `/entrevista` | dinâmica | Consentimento → sessão com a Lia → processamento. `?ritmo=rapido` acelera só a demo |
| `/relatorio/[id]` | dinâmica, `noindex`, `no-store` | Relatório editorial. `demo-*` são sintéticos; ids reais têm 22 caracteres aleatórios |
| `/privacidade` | estática | **Rascunho** factual para revisão jurídica |
| `POST /api/analise` | API | `modo: demo` (resposta sintética + validador real) ou `modo: real` (LLM + validador + store) |
| `GET /api/relatorios/[id]/pdf` | API | PDF A4 gerado no servidor a partir do objeto validado |
| `POST /api/email/solicitar` | API | Envia código de 6 dígitos (10 min) ao endereço informado |
| `POST /api/email/confirmar` | API | Confere o código e envia o PDF em anexo (uma vez por documento+endereço) |
| `GET /api/email/preview?id=demo-*` | API | Prévia HTML do e-mail, apenas para demos; nada é enviado |
| `GET /api/status` | API | Booleanos das integrações ativas (nunca valores) |

Documentos de demonstração disponíveis: `demo-tres`, `demo-dois`, `demo-um`, `demo-zero` (0–3 talentos), `demo-generico` (respostas genéricas), `demo-apoio` (alerta de bem-estar) e `demo-sessao-N` (conversa demo interrompida no turno N).

## Arquitetura

```
app/                      rotas e Route Handlers
components/
  ascii/                  sistema ASCII (motor canvas + 6 componentes)
  site/                   cabeçalho, rodapé, logotipo
  marketing/              seções da landing
  entrevista/             experiência da entrevista e transição de processamento
  relatorio/              capítulos do relatório, ações, e-mail
lib/
  domain/                 catálogo editorial (textos do framework) e modelo ReportDocument
  demo/                   DADOS SINTÉTICOS (conversa e resposta do analista)
  voice/                  contrato VoiceProvider, provedor demo, adaptador Agora previsto, medidor de microfone
  analyst/                adaptador do analista (lê o Prompt B do markdown original)
  pdf/                    documento PDF (@react-pdf/renderer)
  email/                  templates React Email + serviço (Resend)
  store/                  KV com TTL: memória (local) ou Upstash Redis REST
  security/               ids aleatórios, HMAC, códigos, rate limit
  ascii/core.ts           funções ASCII puras (web, PDF e e-mail usam as mesmas)
src/                      domínio original (inalterado) + declarações .d.ts
assets/fonts/             TTF/WOFF (SIL OFL) usados pelo PDF
```

### Fluxo de dados

```
Entrevista (VoiceProvider) ──► transcrição PESSOA:/LIA:
      └─► POST /api/analise ──► analista (demo: sintético | real: LLM)
                               └─► validarRelatorio()  ◄── fonte única da verdade
                                    └─► ReportDocument (sem transcrição) ──► store (real) / reconstrução (demo)
/relatorio/[id] ──► ReportView      /api/.../pdf ──► ReportPdf      /api/email/* ──► Resend
```

## Design system

**Tokens** (`app/globals.css`, espelhados em `PDF_TOKENS` e nos templates de e-mail): `paper #F5F2E9`, `ink #111`, `surface #FFF`, `muted #E7E2D7`, `signal #F8D94B` (destaque principal), `green #B8E986` (apenas estados), `error #D94A3A` (texto de erro em `#A3291C` para contraste AA). Dark mode por `prefers-color-scheme` ou `data-theme`.

**Tipografia:** Space Grotesk (display), Instrument Sans (texto/UI), IBM Plex Mono (metadados, números, ASCII). Escalas: `display-monument`, `display-xl`, `display-l`, `display-m`, `lede`, `meta`, `num-huge`.

**Primitivas (em `@layer components`, para utilitários Tailwind prevalecerem):** `shell`, `grid-12` (4/8/12 colunas), `section`, `rule`, `btn` (+ `btn-primary`, `btn-ink`, `btn-onsignal`, `btn-ghost`, `btn-danger`, `btn-sm`), `panel`, `tag` (+ `tag-signal`, `tag-green`, `tag-demo`), `quote`, `callout`, `mark`, `input`, `field-label`, `field-error`, `check`, `vertical-meta`. Raio zero, bordas de 1–2 px, sombra deslocada sólida, microinteração de pressão.

**ASCII:** `AsciiField` (hero; ruído que se organiza perto do ponteiro e muda com a rolagem), `AsciiPortrait` (perfil + ondas de voz), `AsciiWave` (reage ao nível real do microfone; sem áudio, só ritmo de estado), `AsciiProcessing` (caos → grade conforme o progresso **real**), `AsciiDivider` (separador de capítulos), `AsciiFingerprint` (padrão determinístico do id do relatório, sem dados pessoais). Todos `aria-hidden`; o motor pausa fora da tela/aba oculta e desenha um quadro estático com `prefers-reduced-motion`, `saveData` ou aparelhos com ≤2 núcleos/≤2 GB.

## Estado das integrações

| Integração | Estado | Para ativar |
| --- | --- | --- |
| Voz (Agora) | **Prevista, não ligada.** Contrato `VoiceProvider` pronto; `AgoraVoiceProvider` falha explicitamente | Implementar `lib/voice/agora.ts` (ver abaixo) + `AGORA_*`; mudar `agoraImplementado` em `lib/config.ts` |
| Analista LLM | **Funcional se configurado** (qualquer endpoint `/chat/completions`), testado com fetch simulado | `ANALYST_LLM_API_KEY`, `ANALYST_LLM_BASE_URL`, `ANALYST_LLM_MODEL` |
| Armazenamento | Memória em local; **Upstash Redis REST** em produção | `UPSTASH_REDIS_REST_URL` / `_TOKEN` (ou `KV_REST_API_*`) |
| E-mail (Resend) | **Funcional se configurado**, testado com provedor falso. Nenhum envio real foi feito | `RESEND_API_KEY`, `EMAIL_FROM` (domínio verificado), `EMAIL_HASH_SECRET`, store persistente, `APP_BASE_URL` |
| PDF | **Funcional**, sem dependência externa | — |

Em produção, e-mail e análise real exigem store persistente: memória não é compartilhada entre funções serverless.

### Integração Agora (próximo passo)

1. Route Handler `POST /api/sessao`: gerar token RTC (`agora-token`) e iniciar o agente conversacional com o Prompt A **lido de `prompts/`** como system prompt (credenciais `AGORA_CUSTOMER_ID/SECRET` só no servidor).
2. `AgoraVoiceProvider`: `agora-rtc-sdk-ng` para entrar no canal, publicar o microfone e assinar o áudio da Lia; `getLevel()` a partir do volume do track; transcrições com autor vindo dos eventos do agente, não de rótulos do cliente.
3. Encerramento: confirmar o estado da sessão no servidor; a frase fixa é só sinal de UX (ver `docs/arquitetura.md`).
4. `POST /api/analise` em modo real deve receber a transcrição do **servidor** (por id de sessão), não do navegador.

## Segurança e privacidade implementadas

- Relatório real: id de 128 bits, `noindex`, `Cache-Control: private, no-store`, expiração (`REPORT_TTL_DAYS`).
- O documento guarda o resultado validado e contagens; **não** a transcrição.
- E-mail: só backend; verificação por código (hash HMAC, 5 tentativas, uso único); limites por IP, documento e endereço; idempotência no provedor + marca de envio; endereço nunca em logs (apenas HMAC); sem transcrição no corpo; demos nunca são enviadas.
- Receber por e-mail é explicitamente separado de autorizar compartilhamento com empresa (`compartilhamento_permitido` continua sempre `false`).
- Alerta de bem-estar: nenhuma parte do relatório é exibida, impressa ou enviada; apenas canais de apoio (CVV 188).

## Limitações conhecidas

- Sem autenticação: quem tem o link de um relatório real consegue abri-lo (mitigado por id aleatório e expiração). A Fase 2 adiciona contas.
- O link no e-mail expira com o documento, não individualmente.
- `PDF`: fontes do PDF vêm de `assets/fonts` (Space Grotesk/Instrument Sans TTF do Google Fonts; IBM Plex Mono WOFF oficial da IBM — o TTF de terceiros quebrava o parser de fontes).
- Os testes E2E usam um único servidor local; `workers` limitado a 3.
