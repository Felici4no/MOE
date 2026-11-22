# MOE — pontos da empresa, personagens com voz e personalidade

A empresa define **o que quer explorar** (pontos), **quem conversa** (personagens com personalidade e voz) e **a situação** (cenas, pressão, clima). A pessoa joga no escritório Pixel Agents e recebe uma leitura **dela**. A empresa só vê se a pessoa compartilhar, e para de ver se ela desfizer.

## Regras de produto (não negociáveis)

- **Sem nota.** O peso (1–5) de um ponto define foco e ordem de leitura, nunca pontuação.
- **Evidência literal.** Na leitura só entram trechos que estão literalmente nas respostas da pessoa. Falas de personagens nunca contam.
- **Consentimento.** `share_with_tenant` começa falso, é decidido pela pessoa e pode ser revertido. O alerta de bem-estar oculta a leitura e bloqueia o compartilhamento.
- **Sem temas sensíveis.** Pontos, personagens e falas que mencionem religião, política, orientação sexual, gravidez, família/filhos, idade, raça/etnia, deficiência, saúde, origem ou sotaque são recusados (`app/moe/domain.py: SENSITIVE`, mesmas regras da Lia).
- **Retrato publicado.** Publicar congela cenário + personagens + pontos (`published`). Quem joga usa sempre a versão em que começou; editar marca "alterações não publicadas".

## Onde está

| Camada | Arquivos |
| --- | --- |
| Backend (isolado) | `backend/app/moe/` — `models.py`, `domain.py`, `schemas.py`, `service.py`, `routes.py`, `analysis.py`, `prompting.py`, `template.py` |
| Registro no app | 1 linha em `backend/app/core/db.py` (tabelas) e 2 em `backend/app/main.py` (roteador) |
| Testes | `backend/tests/test_moe.py` (12) · `frontend/tests/e2e-fullstack/moe-empresa.spec.ts` |
| Editor da empresa | `frontend/src/app/app/empresa/moe/` (Cenários, Pontos, Personagens, Resultados compartilhados) |
| Participante | `frontend/src/app/app/moe/` (lista) e `/moe?cenario=<id>` / `/moe?sessao=<id>` (escritório) |
| Escritório | elenco dinâmico via `moe:cast` (`office/moe-webview/protocol.ts`), até 4 personagens, visual = perfil do Pixel Agents (0–5) |

## API (`/api/v1/moe`)

**Empresa (owner/admin):** `GET catalog` · `GET|POST points` · `PUT|DELETE points/{id}` · `GET|POST personas` · `PUT|DELETE personas/{id}` · `GET|POST scenarios` · `POST scenarios/from-template` · `GET|PUT|DELETE scenarios/{id}` · `POST scenarios/{id}/publish|unpublish` · `GET results` (só compartilhados).

**Pessoa (qualquer membro do locatário):** `GET play/scenarios` · `GET|POST play/sessions` · `GET play/sessions/{id}` · `POST play/sessions/{id}/answers` (na ordem das cenas) · `POST play/sessions/{id}/finish` · `POST play/sessions/{id}/share`.

## Contrato com a integração de voz (Agora)

O backend expõe `app.moe.prompting.scene_brief(snapshot, scene_id)`:

```python
{
  "scene_id": "colega",
  "persona": {"id": "...", "name": "Léo", "role": "Colega", "look": 2},
  "voice": {"tone": "dinamica", "voice_id": "nova" | None},   # None = voz padrão do TTS configurado
  "greeting": "Estou com uma tarefa atrasada...",              # fala de abertura da cena
  "system_prompt": "Você é Léo, Colega... REGRAS (nunca quebre): ..."
}
```

- O `snapshot` vem de `MoeSession.snapshot` (versão congelada que a pessoa está jogando).
- O `system_prompt` traz personalidade, postura, jeito de falar, clima e pressão, mais as regras fixas: não avaliar, não revelar os pontos, sem temas sensíveis, sem promessas, saída de papel com CVV 188 em caso de sofrimento. **Ele não inclui os pontos analisados nem respostas anteriores.**
- Uma voz por vez: a cena atual é a primeira sem resposta em `answers`.
- Transcrição da pessoa → `POST play/sessions/{id}/answers` com `scene_id` e o texto (o servidor só aceita a cena atual).
- No front, o estado "falando/ouvindo" do escritório é controlado por `moe:speaking`/`moe:awaiting` (já usados no modo texto).

**Vozes.** `GET catalog` → `voices` lista apenas vozes reais do fornecedor configurado: as seis do OpenAI `tts-1` quando `TTS_VENDOR=openai`; nos outros fornecedores, `TTS_VOICE_ID` + `MOE_VOICE_CATALOG="id|Rótulo,id|Rótulo"`. Uma persona só aceita `voice_id` do catálogo; o editor mostra "fora do catálogo atual" se a configuração mudar depois. Nenhum id foi inventado.

## Leitura por ponto

`POST finish` → `analysis`:
- **Com `ANALYST_LLM_API_KEY`:** o modelo propõe sinais e trechos por ponto. O validador descarta trechos que não estejam literalmente nas respostas e sinais fora do catálogo do ponto (`method: "llm"`).
- **Sem modelo:** as respostas são agrupadas pelos pontos de cada cena, sem interpretação (`method: "mapeamento"`).

## Limites atuais

- Até 6 cenas, 4 personagens por cenário, 12 pontos por cenário, 30 pontos e 20 personagens por empresa.
- O escritório tem um único layout (o padrão do Pixel Agents); os assentos são distribuídos pelo motor.
- A conversa ainda é por texto (`DEMO SEM VOZ`) até a integração Agora usar o `scene_brief`.
