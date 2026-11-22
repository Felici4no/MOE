# Resona

Contratação por fit cultural. A empresa sobe a cultura, cria vagas com as soft skills e o perfil comportamental esperados, importa a planilha de candidatos e envia em lote uma entrevista por voz com a Lia. Ao fim de cada conversa, a IA gera a análise de fit (cultura, perfil, soft skills) com os diferenciais de cada pessoa, sempre com citações literais da entrevista, e a vaga mostra o ranking e a distribuição.

O produto atende só empresas. O antigo portal Individual (B2C, compra avulsa) foi removido.

| Quem | O que faz |
| --- | --- |
| **Empresa** (administrador) | cultura (texto ou PDF/DOCX/TXT), vagas, importação .xlsx/.csv, convites em lote, ranking, distribuição e análise por candidato |
| **Candidato** | aceita o convite da vaga autorizando a empresa a ver a análise, faz a entrevista, vê o próprio Mapa e pode retirar a autorização |

Uma vaga também pode ser avaliada por **simulação no escritório** (MOE): personagens com objetivo, preocupações e memória conversam com o candidato em etapas (ex.: time de devs → gerência → diretoria), e o fit inclui **hard skills**. Detalhes em [docs/moe/empresa-e-personagens.md](docs/moe/empresa-e-personagens.md); cliente teste: `cd backend && .venv/bin/python -m app.seed_cliente_teste`.

A empresa nunca vê a transcrição completa nem o áudio; vê notas, diferenciais e os trechos citados. Relato de sofrimento sério mantém a análise privada.

```text
Navegador (Next.js) ──mic──▶ Agora RTC ◀── agente Agora (STT → LLM → TTS)
      │  HTTPS /api                              │ ferramenta RecordEvidence
      ▼                                          ▼
   FastAPI (Pydantic, services) ──▶ Postgres (contas, locatários, convites, créditos, entrevistas, perfis)
```

Base: o padrão de agente Agora do [OpenSense](../opensense) (`agora-agents`).

## Rodar localmente

```bash
cd backend && python3.12 -m venv .venv && .venv/bin/pip install -e '.[test]'
.venv/bin/uvicorn app.main:app --port 8000
```

```bash
cd frontend && npm ci && npm run dev
```

Abra http://localhost:3000. Sem `.env`, a API usa SQLite em `.runtime/` e a assinatura é simulada. Com `ANALYST_LLM_API_KEY`, a extração de valores da cultura, a sugestão de soft skills e a análise de fit usam IA; sem ela, valem os sinais do catálogo (`backend/app/domain/hiring.py`). Para a sala de entrevista funcionar, preencha `AGORA_APP_ID` e `AGORA_APP_CERTIFICATE` no `.env` da raiz (veja [deploy/runtime.env.example](deploy/runtime.env.example)). A sala oferece um teste local de microfone antes da entrevista e sinaliza o nível de entrada durante a conversa.

Testes:

```bash
cd backend && .venv/bin/python -m pytest -q
```

```bash
cd frontend && npx tsc --noEmit && npm run lint && npm run build
```

## Estrutura

| Caminho | O que tem |
| --- | --- |
| `backend/app/core` | configuração tipada (pydantic-settings), banco, senhas argon2 e JWT em cookie httpOnly |
| `backend/app/models` | tabelas: tenants, users, memberships, invites, purchases, credits, interviews, results |
| `backend/app/schemas` | contratos Pydantic de entrada/saída |
| `backend/app/repositories` | consultas reutilizáveis |
| `backend/app/services` | regras: contas, locatário, cobrança, entrevista, agente Agora, análise |
| `backend/app/domain/taxonomy.py`, `plans.py` | framework do Mapa de Talentos (16 talentos, 4 domínios, 6 caminhos) e os 4 planos |
| `frontend/src/app` | entrada com duas portas, painel, sala de entrevista, perfil, painel da empresa, aceite de convite |
| `deploy/`, `infra/`, `scripts/` | VM Lightsail, instalador, Nginx, systemd e empacotamento |
| `materiais/` | insumo de pesquisa (ver aviso abaixo) |

## Mapa de Talentos

O framework vem de [Felici4no/mapa-de-talentos](https://github.com/Felici4no/mapa-de-talentos): 16 talentos em 4 domínios (Fazer Acontecer, Lidar com Gente, Pensar e Criar, Força Interior), ligados ao Big Five/IPIP, e 6 caminhos de interesse (RIASEC). Daqui vieram também o roteiro da Lia, as regras do resultado e o validador de citações, portado para Python em `backend/app/services/analysis.py` com os mesmos casos de teste.

1. A Lia conduz a conversa (roteiro do prompt A) e, com ferramentas ativas, registra evidências literais.
2. No fim, o analista de texto (prompt B, `ANALYST_LLM_API_KEY`) propõe talentos e caminhos. Sem ele, valem as evidências da Lia e, por último, os sinais do catálogo.
3. Toda proposta passa pelo validador: citação literal de fala da pessoa (até 25 palavras), uma por fala, talento só com 2+ evidências, Forte (3+) ou Moderado (2), no máximo 3 talentos, um "ainda em descoberta" e até 2 caminhos.
4. Relato de sofrimento sério ativa o alerta de bem-estar: o Mapa fica só com a pessoa, com canais de apoio (CVV 188), e o compartilhamento é bloqueado.

Não é teste psicológico validado e não decide contratação, demissão ou promoção.

## Tentativas e guardrails

- Cada entrevista tem **3 tentativas**. Queda de conexão, saída da página ou 45 s sem sinal fecham a tentativa com horário (`dropped`/`left`); a Lia retoma de onde parou. Depois da 3ª, o Mapa é gerado com o que houver.
- **Guardrails:** a Lia só entrevista. Tentativas de manipular a entrevistadora ou o resultado, pedir outra tarefa, mudar o tom ou ofender geram advertência. Elas vêm do detector do servidor sobre a transcrição e da ferramenta `ReportOffScript` da Lia, que só conta com a citação literal. A pessoa é avisada no início e a cada advertência; **na 3ª a entrevista é cancelada**.
- Tentativas e advertências ficam em `interviews.attempts` e `interviews.violations`, com horário, tentativa, tipo e origem.
- A conta designada por `PF_INTERVIEW_MASTER_USER_ID` pode recomeçar as próprias entrevistas em sessões privadas de teste. O reinício preserva o histórico e os Mapas anteriores, e não usa outro crédito de compra ou convite.

## Planos e Stripe

| Plano | Cobrança | Valor estimado | Entrevistas |
| --- | --- | --- | --- |
| Equipe | assinatura mensal (Checkout `subscription`) | R$ 890/mês | 15 por mês |
| Empresa | assinatura mensal | R$ 2.490/mês | 50 por mês |
| Enterprise | sempre contato direto (`/planos` → lead) | sob consulta | sob medida |

Os valores são estimativas para validar com o comercial (`backend/app/domain/plans.py`). Empresas sem plano testam com 5 convites.

- Chaves Stripe ficam fora do repositório, em `~/.config/pontos-fortes/stripe.env` (ou no caminho de `PF_STRIPE_ENV_FILE`), com `STRIPE_SECRET_KEY=sk_test_…` e `STRIPE_WEBHOOK_SECRET`. A API recusa chave que não seja de teste.
- `backend/.venv/bin/python scripts/stripe_catalog.py --apply` cria produtos e preços em BRL com `lookup_key` (idempotente). O valor nunca vem do navegador.
- Webhook `/api/v1/billing/webhook`: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.*` e `invoice.paid`.
- Portal de cobrança da Stripe para a empresa (faturas, cartão, cancelamento). Faturas: a Checkout de pagamento único emite fatura; as assinaturas geram faturas recorrentes.
- Stripe Tax: a API da Stripe responde que a Tax ainda não é suportada no país da conta. Mantenha `STRIPE_AUTOMATIC_TAX=false`. A NFS-e brasileira não é emitida pela Stripe e precisa de um emissor à parte.

### Conta Stripe de teste ("RH sandbox", modo teste) · 22/11/2026

Plano gerado pelo `stripe_implementation_planner` e aplicado:

- Checkout hospedado (redirecionamento); preço fixo; cobrança no ato; assinaturas em modo de cobrança flexível.
- Catálogo criado: `Pontos Fortes Individual` (`pf_individual_once`, R$ 149 único), `Pontos Fortes Equipe` (`pf_equipe_monthly`, R$ 890/mês) e `Pontos Fortes Empresa` (`pf_empresa_monthly`, R$ 2.490/mês), sem código fiscal.
- Portal do cliente `bpc_1UeUlCFIFQNgdVbSvYNCTC67` (padrão da conta): faturas, troca de cartão, troca entre Equipe e Empresa com rateio, cancelamento no fim do período, atualização de endereço e CNPJ.
- Enterprise: contato direto. A proposta vira cotação (Quotes) ou fatura criada no painel, paga pela página de fatura hospedada com lembretes.

Falta no painel da Stripe: ativar Smart Retries e e-mails de cobrança falha (Billing → Revenue recovery), a identidade visual das faturas, os lembretes de fatura e o endpoint de webhook. Para o servidor, falta a chave `sk_test_` em `~/.config/pontos-fortes/stripe.env` (local) e no `runtime.env` (VM).

## Deploy

Veja [deploy/README.md](deploy/README.md).

## Protótipo original do Mapa de Talentos

Os arquivos do protótipo continuam neste repositório e são a fonte do framework usado pelo app:

| Caminho | Conteúdo |
| --- | --- |
| [`docs/framework_mapa_de_talentos.md`](docs/framework_mapa_de_talentos.md) | Os 16 talentos, 4 domínios e 6 caminhos |
| [`prompts/prompts_mapa_de_talentos.md`](prompts/prompts_mapa_de_talentos.md) | Prompt da Lia (entrevistadora) e do analista |
| [`docs/arquitetura.md`](docs/arquitetura.md), [`docs/plano-de-testes.md`](docs/plano-de-testes.md) | Arquitetura e cenários de teste |
| [`src/validar-relatorio.js`](src/validar-relatorio.js), [`tests/`](tests/) | Validador de citações em JavaScript (`npm test`), portado para Python em `backend/app/services/analysis.py` |
