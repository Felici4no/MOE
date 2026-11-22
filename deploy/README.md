# Deploy na Lightsail

## Estado publicado (22/11/2026)

- **https://pontosfortes.23.21.15.247.sslip.io**, certificado Let's Encrypt até 20/02/2027, renovação pelo `certbot.timer`.
- Instância `pontos-fortes` (tag `Project=pontos-fortes`), `small_3_0` (2 GB RAM, 2 vCPU, 60 GB), us-east-1a, Ubuntu 24.04. IP estático `pontos-fortes-ip` = 23.21.15.247.
- A `opensense-web` (32.200.41.71) foi apagada nesta data, a pedido do usuário. Nenhum backup do SQLite do OpenSense foi feito, porque o acesso SSH à VM antiga não foi autorizado. A API do app Android do OpenSense está fora do ar.
- SSH: chave própria em `.runtime/infra/ssh-key`; host key ED25519 `SHA256:SIyv8uEOZ3SYu6y/QiJnwvxPOJwKxER1bWCVmrLQKBs` fixada em `.runtime/infra/known_hosts` (confiança no primeiro acesso). Porta 22 liberada só para o IP do operador (/32), atualizado em 22/11/2026.
- `pf-api` (127.0.0.1:8000, 1 worker), `pf-web` (127.0.0.1:3000) e Postgres local (base `pontos`). `runtime.env` gerado por lista permitida, sem chaves AWS; fica em `/etc/pontos-fortes/runtime.env` (root:pf-api 640).
- Usuário IAM `Opnr` recebeu a política [iam-policy-pontos-fortes.json](../infra/iam-policy-pontos-fortes.json).
- Verificado: HTTP→HTTPS 301; `/api/docs` 404 em produção; escrita com origem externa 403; cadastro de empresa, convite e aceite; agente Agora iniciado pela API pública (1,6 s) e encerrado. Os dados de QA foram apagados; o banco está vazio.
- A sala usa áudio da Agora e transcrição ao vivo. O teste de microfone roda no navegador antes de iniciar a sessão.

### Atualização de 22/11/2026: Mapa de Talentos, planos, tentativas e guardrails

- Backup antes da migração: `/var/backups/pontos-pre-mapa.sql` (600). A migração aditiva criou `interviews.attempts`/`violations`, `tenants.plan` e as colunas de assinatura, `results.paths`/`discovering`/`wellbeing_alert`, a tabela `leads` e ampliou `interviews.status` para 20 caracteres.
- Incidente: o instalador regravava o Nginx só com HTTP e pulava o certbot quando o certificado já existia. Por isso o HTTPS ficou fora do ar entre a republicação da correção do convite e esta atualização. O `install.sh` agora reaplica o certificado (`certbot install`) e confere o HTTPS ao final.
- Verificado em produção: `/`, `/planos`, `/app` 200; `/api/v1/plans` com os 4 planos; cota de teste (2 convites, o 3º recusado com 402); assinatura recusada sem Stripe; contato Enterprise registrado. Dados de QA apagados.

### E-mail dos convites (Resend) · 22/11/2026

`PF_SMTP_*` na VM aponta para a Resend (`smtp.resend.com:465`, usuário `resend`, senha = chave da API) com remetente `Pontos Fortes <onboarding@resend.dev>`. Esse remetente de teste só entrega para o e-mail dono da conta Resend. Para convidar qualquer pessoa, verifique um domínio na Resend e troque `PF_SMTP_FROM` para um endereço desse domínio. Primeiro envio aceito pelo SMTP em 22/11/2026 (convite da conta de teste da empresa).

```bash
ssh -i .runtime/infra/ssh-key -o UserKnownHostsFile=.runtime/infra/known_hosts -o StrictHostKeyChecking=yes ubuntu@23.21.15.247
```

## Decisão de infraestrutura

Uma VM só, **Lightsail small_3_0 (2 GB RAM, 2 vCPU, 60 GB, ~US$ 12/mês)**, rodando Nginx, FastAPI, Next.js standalone e Postgres local. Ela substitui a `opensense-web` (1 GB), que é apagada.

- 1 GB não comporta bem Postgres + Node + Python juntos; 2 GB deixa ~1 GB livre (limites systemd: API 700 MB, web 400 MB).
- VM separada só para o banco não compensa no MVP: dobra custo e latência sem ganho real até haver carga. Quando houver, o caminho é Lightsail Managed Database ou RDS, trocando só `PF_DATABASE_URL`.
- IP estático anexado (gratuito enquanto anexado), para o hostname `pontosfortes.<ip>.sslip.io` e o certificado não quebrarem num restart.

Apagar a `opensense-web` derruba a API usada pelo app Android do OpenSense.

## Passo a passo

Na estação (credenciais AWS só no `.env` local, nunca na VM):

```bash
backend/.venv/bin/pip install boto3 python-dotenv
backend/.venv/bin/python infra/lightsail.py plan --ssh-cidr $(curl -s https://checkip.amazonaws.com)/32
```

```bash
backend/.venv/bin/python infra/lightsail.py replace --ssh-cidr $(curl -s https://checkip.amazonaws.com)/32 --apply --confirm-delete opensense-web
```

O script só apaga instância com a tag `Project=opensense`, cria `pontos-fortes` com chave SSH própria (`.runtime/infra/ssh-key`, 600), anexa IP estático e abre 22 (/32), 80 e 443.

Pacote e instalação:

```bash
./scripts/package.sh
```

Envie `.runtime/releases/pontos-fortes.tar.gz` e um `runtime.env` montado a partir de [runtime.env.example](runtime.env.example) para `/etc/pontos-fortes/runtime.env` (root:pf-api, 640), depois na VM:

```bash
sudo bash deploy/install.sh /home/ubuntu/pontos-fortes.tar.gz pontosfortes.<ip>.sslip.io
```

O instalador recusa host do Receita, instala Postgres/Nginx/Node 22/certbot, cria a base `pontos`, ativa `pf-api` (127.0.0.1:8000, 1 worker) e `pf-web` (127.0.0.1:3000) e emite o certificado.

## Stripe (modo teste)

`PF_INTERVIEW_PAYMENTS_ENABLED=false` pausa novas compras individuais e libera uma entrevista gratuita por modalidade nas contas Individuais. A conta mestre pode refazer todas as modalidades. Use `true` para encerrar o teste gratuito e publicar o checkout individual quando a Stripe estiver configurada. O ajuste entra em vigor após reiniciar `pf-api`.

Crie um webhook para `https://<host>/api/v1/billing/webhook` com o evento `checkout.session.completed` e coloque `STRIPE_SECRET_KEY=sk_test_…` e `STRIPE_WEBHOOK_SECRET` no runtime.env. A API recusa chaves que não sejam de teste.

## Operação

```bash
sudo systemctl status pf-api pf-web nginx postgresql
sudo journalctl -u pf-api --since '10 minutes ago'
sudo -u postgres pg_dump pontos > /var/backups/pontos-$(date +%F).sql
```

Reiniciar a API encerra entrevistas em andamento (salas ficam em memória num único worker); contas e perfis ficam no Postgres. Rollback: apontar `/opt/pontos-fortes/current` para a release anterior e reiniciar `pf-api pf-web`.
