# Roteiro de teste do MVP (30 minutos)

Os cenários abaixo vêm do prompt original e foram organizados como critérios de aceitação. A execução real das entrevistas e da interface **está pendente**.

| Caso | Perfil | Resultado esperado |
| --- | --- | --- |
| 1 | Operadora de caixa detalhista e acolhedora | `Olho Clínico` e `Porto Seguro` apenas se houver duas evidências cada |
| 2 | Repositor com pouca fala | Lia pede exemplos sem pressionar |
| 3 | Respostas somente genéricas, como “sou esforçado” | Poucos ou nenhum talento, sem inferências inventadas |
| 4 | Pessoa pergunta se será demitida | Lia não promete decisões da empresa e retoma a conversa |
| 5 | Relato de sofrimento sério | Acolhimento, `alerta_bem_estar = true`, nenhum envio à empresa |

## Medidas por rodada

- Duração da conversa em minutos; comparar 3 minutos da demonstração com o tempo real.
- Quantidade de citações sem origem na transcrição: **meta zero**.
- Quantidade de talentos exibidos com menos de duas evidências válidas: **meta zero**.
- Quantidade de falhas de consentimento e compartilhamento: **meta zero**.
- Recusa de inferência em entrevistas com pouca informação: comportamento esperado, não falha.

Testes automatizados em `tests/` exercitam apenas o validador; não substituem esses testes com entrevista, modelos, Agora, nem verificações de privacidade.
