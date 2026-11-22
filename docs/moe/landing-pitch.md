# Landing MOE — narrativa do pitch e identidade digital

## Estado

Branch `feat/moe-landing-pitch` (partindo da simulação em `feat/moe-playable`). Página inicial `/` com narrativa visual do pitch, imagens extraídas de capturas existentes da interface, CTA real para `/moe` e acesso antigo preservado em `/acesso`. **O deploy deve ser confirmado por um teste de Preview na Vercel**; a existência da branch não prova que o site está público.

## Conceito e objetivo

MOE / MyOfficeExperience: **Não decidimos por você. Damos mais contexto.**

Problema: uma contratação malsucedida pode custar caro, e aspectos da relação entre pessoa e função podem permanecer pouco explorados. O MOE oferece simulações de situações de trabalho com personagens virtuais e uma devolutiva baseada nas escolhas feitas **dentro do contexto fictício**.

Não afirmar que entrevistas são a causa das contratações erradas, que o MOE já mede competências reais com validade preditiva, nem que a simulação determina o fit cultural de uma pessoa. O produto oferece informações complementares para avaliação humana.

## Como o pitch se transforma em landing

| Pitch | Seção web | Objetivo |
| --- | --- | --- |
| Capa / pergunta de abertura | Hero | "Uma entrevista não reproduz um dia de trabalho" e CTA entrar no escritório |
| Peso da contratação errada | O problema | Custo como cenário ilustrativo e não fato universal |
| Nem sempre é técnico | Fricções | Contexto, comunicação e colaboração |
| Revelação do MOE | A experiência | Captura do escritório e elenco |
| Simulação de rotina | Como funciona | Contexto → decisão → devolutiva |
| Diferencial | Decisão observável | Quatro dimensões a observar no cenário, sem pontuações automáticas |
| Relatório | Devolutiva | Respostas literais separadas de histórias autobiográficas |
| Encerramento | CTA | "Não decidimos por você. Damos mais contexto" |

## Direção de arte

- Neobrutalismo editorial com bordas retas, grid espaçado, tipografia de títulos condensada e contraste entre seções claras e fundo azul-escuro.
- Tokens desta landing isolados no CSS Module `frontend/src/app/landing.module.css`, sem alterar `globals.css` nem as páginas de produto.
- Cores: night `#121722`, paper `#f5f2e9`, yellow `#f5d65a`.
- Pixel art representa **o produto existente**, não imagem de mockup inventado.
- Layout responsivo; teclado, contraste e links claramente navegáveis; sem animações obrigatórias.

## Capturas usadas na landing

São imagens reais já versionadas em `docs/moe/capturas/`, copiadas byte a byte para `frontend/public/moe/` para servir no Next.js:

- `office.png` ← `empresa-escritorio.png`
- `simulation.png` ← `preview-simulacao-desktop.png`
- `report.png` ← `preview-devolutiva-desktop.png`
- `entry.png` ← `preview-entrada-desktop.png`
- `characters.png` ← `empresa-personagens.png`

Não confundir as imagens existentes com a integração de voz. O MVP MOE disponível nesta branch tem **demo textual**. Não exibir "Agora integrado" sem comprovação de uma chamada real funcionando.

## Custo de contratação — ressalvas editoriais

A seção de impacto usa um **cálculo hipotético**: 80% × (R$ 12.500 × 12) = R$ 120.000. A proporção foi citada em estimativas da Gallup para reposição de trabalho técnico; sua aplicação a um salário de referência não equivale a um estudo específico do Brasil, nem a custo de rescisão durante experiência. Não usar esses R$ 120 mil como perda garantida ou média estatística.

Referências:
- [Gallup](https://www.gallup.com/workplace/646538/employee-turnover-cost-business.aspx)
- [Robert Half Brasil](https://www.roberthalf.com/br/pt)

## Rotas e convivência com o aplicativo

- `/`: nova landing MOE.
- `/moe`: simulação existente.
- `/office`: rota legada para a simulação.
- `/acesso`: home anterior dos portais (individual/empresa), preservada.
- `/app`: área interna já existente.
- Não modificar backend, autenticação, Supabase, Agora, Stripe nem histórico de relatórios nesta feature.

## Checklist de QA

```bash
git checkout feat/moe-landing-pitch
git submodule update --init --recursive
cd frontend
npm ci
npm run build
npm run dev
```

Verificar `/`, `/moe` e `/acesso` em desktop e celular. Testar navegação por teclado, imagens, carregamento de fonte, responsividade, links externos, metadados, imagens com `alt`, contraste e console sem erro. Testar que o build do Pixel Agents por `prebuild` continua funcionando.

## Vercel

O projeto conhecido na conta conectada se chama `mapa-de-talentos`, vinculado anteriormente ao repositório antes da renomeação para `Felici4no/MOE`. O deploy Preview desta branch só é confirmado quando a Vercel retornar deployment com **branch = feat/moe-landing-pitch** e status **READY**. Não promover para produção automaticamente.

O repositório já contém `vercel.json` configurado para build Next.js em `frontend/package.json`. Se a renomeação da origem GitHub impedir deploy automático, verificar e atualizar a conexão do projeto Vercel com `Felici4no/MOE`, sem alterar domínio público atual ou produção.

## Créditos

Motor visual: [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents), copyright © 2026 Pablo De Lucca, MIT. Atribuição e licença preservadas no submódulo `vendor/pixel-agents`.
