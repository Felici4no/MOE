# Office Experience — especificação da experiência

**Status:** especificação + motor de cenário determinístico inicial. Interface pixel art, NPCs em voz, Agora e integração no relatório **não implementados**.

## Propósito

Uma experiência de trabalho simulada, opcional e explicitamente fictícia, que complementa a entrevista da Lia. A pessoa entra em um escritório 2D em pixel art e conversa com colegas virtuais com funções e vozes diferentes. Os agentes apresentam desafios, escutam respostas e reagem de modo contextual quando o modo de voz estiver implementado.

> Não apresentar escolhas dentro da simulação como prova de competências profissionais no mundo real. É uma experiência de reflexão e aprendizagem, não seleção de pessoas nem teste psicológico validado.

## Inspirações e restrições

- [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents): escritório em pixel art para visualizar agentes de programação. **Referência de linguagem e interação, não componente pronto** para entrevistas.
- [ChatDev](https://github.com/OpenBMB/ChatDev): colaboração multiagente com papéis. **Referência conceitual**, não exigir seu framework no MVP.
- [Agora Conversational AI](https://docs.agora.io/en/ai): conexão de voz em tempo real; confirmar APIs e limites atuais antes da implementação.

Não copiar sprites protegidos nem recursos gráficos sem licença apropriada. Produzir sprites próprios ou usar assets com licença verificada.

## Experiência e UX

```
[ENTREVISTA LIA] ───> [RELATÓRIO DE HISTÓRIAS REAIS]
        |
        └──> convite opcional ──> [OFFICE EXPERIENCE]
                                   |
                                   v
        +--------------------------------------------------+
        | OFFICE EXPERIENCE / 001    [SOM] [LEGENDAS] [SAIR]|
        |                                                  |
        |    [MESA]    [MAIA: GESTORA]  [JANELA]            |
        |      [  ]      o                                  |
        |               /|\     [ LEO: COLEGA ]             |
        |               / \          o                      |
        |                                                  |
        |  PERSONAGEM ATIVO: MAIA                           |
        |  "Precisamos entregar hoje. O que você faria?"   |
        |                                                  |
        |  [SEGURAR PARA FALAR] ou [DIGITAR RESPOSTA]       |
        +--------------------------------------------------+
                            |
                            v
                 [DEVOLUTIVA DA EXPERIÊNCIA]
```

- Visão isométrica leve ou top-down, com pixel art própria, navegação simples e sem distração.
- Personagem se aproxima da mesa/sala e recebe o desafio. A movimentação é opcional: o usuário não precisa dominar jogos para concluir.
- Uma voz de NPC ativa por vez; áudio espacial é progressivo, não requisito do MVP. Mostrar nome, função e legenda da fala.
- Aceitar voz **ou texto** (acessibilidade, ambientes barulhentos, pessoas com dificuldades na fala).
- Permitir interromper, silenciar, repetir, sair e refazer sem penalidade.
- A identidade global continua neobrutalista/editorial e com ASCII em títulos, divisórias, loading e resultado. Pixel art só dentro da simulação.
- Não avaliar velocidade de resposta, sotaque, voz, fluência, movimentos do mouse ou tempo de leitura como talentos.

## Personagens do MVP

| NPC | Papel | Tom e objetivo narrativo |
| --- | --- | --- |
| Maia | Gestora de equipe | Voz serena, apresenta prioridades e pergunta como organizar o trabalho |
| Léo | Colega de equipe | Voz mais rápida, relata uma dificuldade e pede colaboração |
| Nara | Cliente interno | Voz objetiva, solicita informações e esclarecimentos |

Cada NPC tem `id`, nome, função, `voiceProfile` e contexto específico. `voiceProfile` é um identificador **abstrato**: escolher voice IDs reais somente após conferir os provedores e configurações disponíveis na Agora. Evitar estereótipos de idade, origem e gênero.

## Cenários

**S01 — Entrega sob pressão (3 a 4 minutos).** Maia explica um prazo difícil; Léo pede auxílio; Nara solicita atualização. O participante precisa dialogar, organizar prioridades e explicar suas decisões.

**S02 — Erro identificado (futuro).** Um dado incorreto aparece em um documento importante. A pessoa decide o que fazer e como avisar a equipe.

**S03 — Desentendimento entre colegas (futuro).** Dois colegas defendem caminhos opostos. A pessoa pode pedir contexto, negociar e organizar uma resposta.

O MVP começa com S01, com três falas de NPC e três oportunidades de resposta. As alternativas fixas são somente fallback de demonstração. A conversa aberta via LLM é futura.

## Arquitetura recomendada

1. `office-scenarios`: definição versionada de cenas, personagens e diálogos iniciais.
2. `office-engine`: máquina de estados determinística, separada de animação e voz. Registrar `sceneId`, `npcId`, texto original e ação escolhida.
3. `office-runtime`: orquestrador backend. No modo real, chama os agentes de voz pela Agora, controla interrupções e impede colisão entre múltiplos NPCs. Para o MVP, pode usar **um único orquestrador LLM com personas por cena**; não ligar três sessões LLM concorrentes por padrão.
4. `office-visual`: frontend 2D, legendas e controle de microfone. Não armazenar áudio bruto sem consentimento informado.
5. `office-evidence`: extração posterior de citações literais das respostas da pessoa e geração de devolutiva interpretativa.

**Segurança:** nunca confiar em rótulos `PESSOA:` enviados pelo navegador como identificação autenticada do falante. O backend deve definir origem e timestamps de eventos; impedir prompt injection de NPCs para mudar regras, compartilhar dados ou tomar ações externas. Os NPCs não podem prometer contratação, demissão ou promoção.

## Integração com Mapa de Talentos

As evidências da simulação aparecem **separadas** das evidências da entrevista da Lia:

```json
{
  "origem": "office_simulation",
  "scenario_id": "entrega-sob-pressao",
  "scene_id": "briefing",
  "speaker": "participant",
  "quote": "Eu começaria entendendo o prazo e falando com o time.",
  "is_real_work_history": false
}
```

Não misturar citações da Office Experience com evidências reais para cumprir a regra de **duas histórias reais diferentes** do validador de talentos. Se houver análise de simulação, apresentar como "O que você experimentou na simulação" e sempre informar a origem. Proibir rankings de desempenho e decisões automatizadas sobre pessoas.

## Privacidade, consentimento e dados

- Entrada opt-in, com explicação do caráter fictício e da gravação/transcrição.
- A pessoa pode abandonar e apagar sua sessão; retenção mínima definida antes de piloto real.
- Relatório pessoal primeiro; compartilhamento empresarial requer consentimento específico separado.
- Dados de voz e transcrições não entram em logs, analytics, repositório público ou telemetria de frontend.
- Testar alternativa somente textual. Se a voz falhar, continuar sem penalidade.
- Avaliar vieses com pessoas de perfis diversos; testar que uma resposta curta ou informal não produz uma falsa "fraqueza".

## Plano de entrega

**Fase A — protótipo de interação:** página `/office`, sala pixel art, NPCs estáticos/animados, cenário S01 e teclado. Engine em `src/office-experience/`.

**Fase B — voz real:** Agora SDK, voz por personagem conforme suporte verificado, transcrição autenticada, turn-taking, interrupção, reconexão.

**Fase C — relatório:** seção separada de simulação no relatório web e PDF, com citações literais verificadas da pessoa e sem pontuação profissional.

**Fase D — expansão:** S02, S03, escolhas mais abertas, replay determinístico e métricas agregadas do uso (não de potencial profissional).

### Critérios de aceitação

- [ ] O cenário S01 roda até o fim, aceita texto e não obriga voz.
- [ ] Personagens mostram nome, função, fala e legenda.
- [ ] O usuário pode sair sem perder acesso ao relatório da entrevista.
- [ ] Nenhuma fala de NPC conta como evidência da pessoa.
- [ ] O resultado diferencia explicitamente "simulação" de "história real".
- [ ] Testes automatizados de estados, fluxo e validação da origem.
- [ ] Nenhum envio de dados da simulação à empresa por padrão.
- [ ] O modo com voz só será marcado "integrado" após teste real com Agora.
