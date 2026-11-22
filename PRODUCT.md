# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

FastAPI + Pydantic (camadas de models, repositories, services, routers) com Postgres em produção e SQLite em desenvolvimento; Next.js + TypeScript no front. Escolha do usuário. Voz em tempo real pela Agora Conversational AI, reaproveitando o padrão do OpenSense (`../opensense`). Deploy em uma VM Lightsail de 2 GB, Nginx + HTTPS.

## Users

- **Pessoa avaliada (B2C):** compra individualmente uma entrevista para descobrir seus pontos fortes. Faz a conversa sozinha, pelo navegador, em português.
- **Organização locatária (B2B):** uma empresa (RH, liderança, consultoria) cria seu espaço, convida colaboradores ou candidatos e acompanha quem concluiu e o resultado de cada um.
- **Convidado de uma organização:** entra por convite de um locatário e faz a mesma entrevista, sem pagar.

## Product Purpose

Pontos Fortes é uma entrevista por voz conduzida pela Lia em tempo real que identifica os talentos naturais de uma pessoa por meio de conversa, não de questionário. O resultado é um perfil dos temas mais fortes, com evidências tiradas das próprias falas. É o primeiro de uma linha de testes por entrevista falada que será vendida.

Sucesso no MVP: uma pessoa consegue se cadastrar (individual ou via empresa), conversar com a Lia e receber o perfil; uma empresa consegue convidar pessoas e ver os resultados.

## Positioning

A avaliação acontece numa conversa falada com a Lia, e cada tema do resultado aponta para trechos do que a pessoa disse. Questionários de autoavaliação não conseguem mostrar a evidência por trás da conclusão.

## Operating Context

- Entrevista de 20 a 30 minutos, no desktop ou celular, com microfone (câmera opcional).
- B2B: conta de organização com membros administradores, convites por e-mail/link, créditos de entrevista.
- B2C: compra pelo Stripe (modo teste no MVP), que libera um crédito de entrevista.
- Materiais de pesquisa sobre a abordagem de talentos da Gallup ficam em `materiais/` apenas como insumo interno.

## Capabilities and Constraints

- Dois caminhos de acesso: **Empresa** (locatário) e **Individual** (aquisição).
- Taxonomia **própria** em português: domínios e temas autorais. Nomes, definições e textos do CliftonStrengths/Gallup não aparecem no produto, por serem marca registrada e conteúdo licenciado.
- O resultado é autoconhecimento e conversa de desenvolvimento; o produto não afirma validade psicométrica nem serve como critério único de contratação.
- Credenciais da Agora e do Stripe ficam só no servidor.
- Indefinido: preço real, provedor de e-mail transacional, política de retenção das transcrições.

## Brand Commitments

Nome: **Pontos Fortes**. Português do Brasil. O usuário pediu um sistema "mais humano e inovador".

## Evidence on Hand

Não há clientes, depoimentos, métricas de validação ou preços reais. Nada disso pode ser inventado; dados de demonstração precisam vir marcados como fictícios.

## Product Principles

1. A conversa é o produto: tudo leva à entrevista e volta dela.
2. Toda conclusão mostra a evidência na fala da pessoa.
3. Fala sobre o que a pessoa tem de forte, nunca sobre déficit.
4. A pessoa decide o que a empresa vê do seu resultado e do seu áudio.
5. Começar simples: um teste, dois caminhos de acesso, poucos passos.

## Accessibility & Inclusion

WCAG 2.2 AA. A fala da Lia aparece em tempo real no painel da transcrição para quem acompanha a entrevista por escrito. Fluxo completo por teclado.
