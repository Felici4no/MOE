# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

FastAPI + Pydantic (camadas de models, repositories, services, routers) com Postgres em produção e SQLite em desenvolvimento; Next.js + TypeScript no front. Escolha do usuário. Voz em tempo real pela Agora Conversational AI, reaproveitando o padrão do OpenSense (`../opensense`). Deploy em uma VM Lightsail de 2 GB, Nginx + HTTPS.

## Users

- **Empresa (RH, liderança):** sobe a cultura, cria vagas com soft skills e perfil comportamental, importa candidatos por planilha, envia convites em lote e compara o ranking de fit.
- **Candidato:** entra pelo convite da vaga, autoriza a empresa a ver a análise e conversa com a Lia pelo navegador, em português.

## Product Purpose

Resona é contratação por fit cultural: uma entrevista por voz com a Lia, enviada em lote aos candidatos de uma vaga, gera o ranking de fit cultural, perfil comportamental e soft skills, com a frase de cada pessoa que sustenta cada nota.

Sucesso no MVP: uma pessoa consegue se cadastrar (individual ou via empresa), conversar com a Lia e receber o perfil; uma empresa consegue convidar pessoas e ver os resultados.

## Positioning

A avaliação acontece numa conversa falada com a Lia, e cada tema do resultado aponta para trechos do que a pessoa disse. Questionários de autoavaliação não conseguem mostrar a evidência por trás da conclusão.

## Operating Context

- Entrevista de 20 a 30 minutos, no desktop ou celular, com microfone (câmera opcional).
- Conta de empresa com administradores, convites em lote por e-mail/link, cota mensal de entrevistas (Stripe em modo teste).
- Materiais de pesquisa sobre a abordagem de talentos da Gallup ficam em `materiais/` apenas como insumo interno.

## Capabilities and Constraints

- Só empresas. O portal Individual (B2C) foi removido.
- Taxonomia **própria** em português: domínios e temas autorais. Nomes, definições e textos do CliftonStrengths/Gallup não aparecem no produto, por serem marca registrada e conteúdo licenciado.
- O ranking apoia a seleção; o produto não afirma validade psicométrica nem serve como critério único de contratação.
- Credenciais da Agora e do Stripe ficam só no servidor.
- Indefinido: preço real, provedor de e-mail transacional, política de retenção das transcrições.

## Brand Commitments

Nome: **Resona**. Português do Brasil. Identidade: Host Grotesk, fundo branco, azul #2e5bff só para ação e destaque de fit, cantos suaves, botões em pílula. Interface limpa: explicações em dicas ao passar o mouse.

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
