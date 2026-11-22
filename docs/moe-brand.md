# MOE — MyOfficeExperience

**Marca pública do módulo:** MyOfficeExperience  
**Sigla:** MOE  
**Assinatura preferida:** `MOE / MyOfficeExperience`  
**Produto-mãe / origem das análises:** Mapa de Talentos (base de pesquisa e motor de evidências); a branch `pontos-fortes` contém uma evolução separada do produto e deve ser preservada.

## Posicionamento

**Um escritório virtual onde decisões viram conversas.**

A pessoa entra em um ambiente 2D em pixel art, interage com colegas de trabalho virtuais, responde a situações comuns e recebe uma devolutiva sobre suas escolhas **dentro da simulação**. Não é entrevista de emprego, teste psicológico ou previsão de desempenho.

- Nome na tela inicial: `MY OFFICE EXPERIENCE`
- Nome compacto: `MOE`
- Selo/código de série: `MOE / EXPERIENCE 001`
- Nome do modo: `Office Simulation`
- Título do resultado: `Sua experiência no escritório`
- Descrição curta: `Entre no escritório. Converse. Decida. Reflita.`
- Aviso fixo: `Esta é uma simulação fictícia. Suas decisões aqui não comprovam competências profissionais nem determinam oportunidades de carreira.`

## Direção de arte

Manter a identidade editorial-neobrutalista do projeto: superfícies claras, texto preto, acento amarelo, títulos em caixa alta, numeração de seções, linhas divisórias, ASCII decorativa, tipografia marcante e controles retos. **Pixel Agents mantém sua pixel art original** no ambiente 2D; customizar a moldura, overlays, nomes e fluxos, sem redesenhar sprites.

- Logo tipográfico: `MOE`, contraste de escala com `MY OFFICE EXPERIENCE`.
- Headline de entrada: `VOCÊ CHEGOU AO ESCRITÓRIO.`
- Frase de apoio: `Três colegas. Uma situação. Suas escolhas.`
- CTA: `ENTRAR NO ESCRITÓRIO`
- Estados com clareza: `PREPARANDO AMBIENTE`, `OUVINDO`, `RESPONDENDO`, `SIMULAÇÃO CONCLUÍDA`.
- Navegação canônica proposta: `/moe`; `/office` serve como alias/redirect para compatibilidade.
- No relatório e PDF: separar `MOE — Simulação` de `Mapa de Talentos — Histórias reais`.

## Personagens iniciais

| ID | Nome | Papel | Identidade de voz |
|----|------|-------|------------------|
| maia | Maia | Gestora | Voz serena |
| leo | Léo | Colega | Voz dinâmica |
| nara | Nara | Cliente interno | Voz objetiva |

`voiceProfile` é abstrato; IDs reais de voz devem vir das configurações Agora confirmadas, sem inventar nomes/modelos.

## Créditos e licença

O motor visual e os sprites incluídos pelo submódulo `vendor/pixel-agents` vêm do **Pixel Agents**, copyright © 2026 Pablo De Lucca, licença MIT. Não remover `LICENSE` nem atribuição. Os elementos do ChatDev são apenas referências de colaboração entre agentes; o código do ChatDev não foi incorporado.

## Critérios de sucesso

1. A pessoa vê **MOE / MyOfficeExperience**, não Pixel Agents, como produto na experiência final; preserva-se o crédito ao software original.
2. O ambiente 2D renderiza de verdade em localhost e no Preview Vercel; sem iframe vazio, 404 nem telas de terminal de programadores.
3. Maia, Léo e Nara aparecem como NPCs e executam três turnos do cenário S01.
4. Voz real da Agora, se integrada, é identificada e testada; fallback de texto declarado.
5. A devolutiva nunca mistura simulações com evidências autobiográficas da Lia.
