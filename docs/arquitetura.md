# Arquitetura inicial

## Serviços e responsabilidades

1. **Cliente (web/móvel):** obtém consentimento, captura mídia, mostra estado da sessão e exibe o relatório apenas para a pessoa entrevistada. Precisa de opção de parar, descartar e consentir separadamente em compartilhar.
2. **Agora + Lia:** condução da entrevista. Não classifica nem pontua. Envia eventos de sessão e transcrição com identificação do emissor. O encerramento previsto no prompt é: `Terminamos nossa conversa. Seu Mapa de Talentos está sendo preparado.`
3. **Backend:** guarda a sessão temporariamente, confere consentimento, dispara a análise no encerramento, valida o resultado e gerencia autorização/revogação. Não deve confiar em eventos criados diretamente pelo navegador sem autenticação.
4. **Analista LLM (texto):** recebe transcrição rotulada (`PESSOA:`/`LIA:`), responde no contrato JSON descrito no prompt original.
5. **Validador determinístico:** exige citações rastreáveis apenas a falas `PESSOA:`. Remove citações falsas e talentos com menos de duas falas distintas verificáveis. Redefine confiança pelo número de citações válidas. Não confia na pontuação original do modelo como métrica validada.
6. **Painel de organização:** no protótipo, 50 profissionais fictícios; jamais misturar esses exemplos com dados de pessoas reais.

## Estados sugeridos

`consentimento_pendente` → `entrevistando` → `entrevista_encerrada` → `analisando` → `validando` → `relatorio_privado` → (opcional) `compartilhado`.

Se `alerta_bem_estar = true`, desviar de `validando` para `apoio_privado` e bloquear qualquer compartilhamento; revisar a política de cuidados com especialistas antes de implantação real.

A frase fixa é um sinal de UX, **não** deve ser o único gatilho de backend: a transcrição pode conter a frase como citação, erro de reconhecimento ou fala da pessoa. Confirmar o estado de sessão e a autoria da frase.

## Evidências e suas limitações

O prompt do analista define 1 ou 2 pontos conforme completude da história; o código **não consegue verificar semanticamente** isso. Por isso, após a validação literal, retira o campo `pontos` da saída exibível. Para pontuar de forma auditável, é necessário um contrato por episódio e revisão das regras de classificação.

Citações com `...` passam se seus trechos ocorrerem na mesma fala, em ordem; o código não considera duas frases da mesma fala como duas evidências independentes. Falas distintas ainda podem abordar o mesmo evento, portanto isso é uma aproximação conservadora, não garantia de independência de histórias.

## Próximas decisões

- Contrato da API Agora e transcrição, incluindo identificação confiável do emissor.
- Schema JSON formal (ex.: JSON Schema/Zod) e versionamento dos prompts.
- Política de privacidade, base legal, retenção, revogação e exclusão.
- Definição de quais elementos de interesse podem ser exibidos em segurança.
- Avaliação com os cinco cenários do roteiro antes do pitch.
