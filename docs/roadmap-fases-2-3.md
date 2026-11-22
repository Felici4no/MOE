# Roadmap — Fases 2 e 3 (especificação, não implementada)

Nada aqui está implementado. Nenhuma rota abaixo existe ainda, e por isso nenhuma é linkada na interface.

## Fase 2 — Contas e onboarding

**Princípio:** a conta serve para a pessoa guardar e controlar os próprios mapas. Nunca para a empresa acessá-los.

| Rota | Objetivo | Requisitos |
| --- | --- | --- |
| `/login` | Autenticação | Link mágico por e-mail (reaproveita a verificação por código da Fase 1) ou OAuth; sem senha como padrão |
| `/cadastro` | Criação de conta | Nome de tratamento, e-mail verificado, aceite de termos versionado |
| `/onboarding` | Apresentação do processo | 3 telas: conversa, evidência, autonomia; consentimento informado registrado com data e versão |
| `/meus-mapas` | Relatórios do usuário | Lista privada, data, status (privado/compartilhado), excluir; vazio com CTA para nova conversa |
| `/configuracoes` | Conta, privacidade e exclusão | Exportar dados, revogar compartilhamentos, excluir conta (com confirmação nomeada) |
| — | Recuperação de acesso | Reenvio de link mágico; limite de tentativas |
| — | Confirmação de e-mail | Mesmo fluxo de código; troca de e-mail exige confirmar o novo |
| — | Histórico de entrevistas | Metadados (data, duração, status), sem transcrição por padrão |

**Compatibilidade com a Fase 1:**
- `ReportDocument` ganha `ownerId?: string`; relatórios anônimos continuam acessíveis pelo id até expirar e podem ser "reivindicados" após login + verificação do e-mail usado no envio.
- `lib/store` passa a indexar `usuario:{id}:relatorios`. Alternativa recomendada para dados relacionais: Postgres (ex.: Neon/Supabase) mantendo o KV para limites e códigos.
- Sessão via cookie `httpOnly` + `proxy.ts` (Next 16) protegendo `/meus-mapas` e `/configuracoes`.
- Biblioteca sugerida: Auth.js ou Better Auth com provider de e-mail usando o Resend já configurado.

## Fase 3 — Institucional e B2B

| Rota | Conteúdo | Observações |
| --- | --- | --- |
| `/sobre` | Origem e propósito | Textos editoriais; sem métricas inventadas |
| `/metodologia` | Critérios e limitações | Expande "Sobre este documento": validador, Big Five/RIASEC, o que **não** é medido |
| `/privacidade` | Tratamento de dados | Hoje existe como rascunho factual; precisa de revisão jurídica (LGPD: base legal, controlador, retenção, encarregado) |
| `/termos` | Termos de uso | Estrutura a revisar com jurídico; não publicar texto definitivo sem revisão |
| `/for-agents` | Integração com agentes de IA | Documentar o contrato JSON do analista, o schema do `ReportDocument`, regras do validador e uma API futura (`GET /v1/relatorios/{id}` com token da própria pessoa) |
| `/para-empresas` | Proposta B2B | Ênfase em autonomia e decisão humana; nada de ranking de pessoas |
| `/dashboard` | Painel empresarial | **Somente dados autorizados** item a item pela pessoa; agregados com k-anonimato; marca "decisão humana" visível; dados fictícios claramente rotulados na demo |

**Pré-requisitos da Fase 3:**
1. Fluxo de autorização de compartilhamento: operação separada, autenticada, granular (por talento/caminho), revogável, com trilha de auditoria. Bloqueada quando `alerta_bem_estar`.
2. Papéis organizacionais (admin, gestor) separados das contas pessoais.
3. Avaliação com os cinco cenários de `docs/plano-de-testes.md` antes de qualquer piloto.
4. Política de retenção e exclusão publicada.
