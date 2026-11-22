#!/usr/bin/env bash
# Publica o pacote de .runtime/releases na VM Lightsail.
#   ./scripts/deploy_vm.sh [--seed-cliente-teste]
# Pré-requisitos na estação: .runtime/infra/ssh-key (600) e .runtime/infra/known_hosts da VM,
# e a porta 22 liberada para o seu IP no firewall da Lightsail.
# Passos: backup do Postgres → envio do pacote → install.sh → (opcional) cliente teste → checagem HTTPS.
set -euo pipefail
cd "$(dirname "$0")/.."
HOST_IP=23.21.15.247
DOMAIN=pontosfortes.23.21.15.247.sslip.io
PKG=.runtime/releases/pontos-fortes.tar.gz
SSH=(ssh -i .runtime/infra/ssh-key -o UserKnownHostsFile=.runtime/infra/known_hosts -o StrictHostKeyChecking=yes -o ConnectTimeout=10)
SCP=(scp -i .runtime/infra/ssh-key -o UserKnownHostsFile=.runtime/infra/known_hosts -o StrictHostKeyChecking=yes)
SEED=${1:-}

test -f "$PKG" || { echo "Rode ./scripts/package.sh antes." >&2; exit 1; }
test -f .runtime/infra/ssh-key || { echo "Falta .runtime/infra/ssh-key (chave da VM)." >&2; exit 1; }

STAMP=$(date +%Y%m%d%H%M%S)
echo "1/5 backup do banco"
"${SSH[@]}" ubuntu@$HOST_IP "sudo -u postgres pg_dump pontos | sudo tee /var/backups/pontos-$STAMP.sql >/dev/null && sudo chmod 600 /var/backups/pontos-$STAMP.sql && sudo ls -l /var/backups/pontos-$STAMP.sql"

echo "2/5 envio do pacote"
"${SCP[@]}" "$PKG" ubuntu@$HOST_IP:/home/ubuntu/pontos-fortes.tar.gz
"${SSH[@]}" ubuntu@$HOST_IP "sha256sum /home/ubuntu/pontos-fortes.tar.gz"
cat .runtime/releases/pontos-fortes.sha256

echo "3/5 instalação"
"${SSH[@]}" ubuntu@$HOST_IP "mkdir -p /tmp/pf-deploy && tar -xzf /home/ubuntu/pontos-fortes.tar.gz -C /tmp/pf-deploy ./deploy/install.sh && sudo bash /tmp/pf-deploy/deploy/install.sh /home/ubuntu/pontos-fortes.tar.gz $DOMAIN"

if [ "$SEED" = "--seed-cliente-teste" ]; then
  echo "4/5 cliente teste (senha aleatória)"
  # Mesmo ambiente da API (EnvironmentFile do systemd); o runtime.env não é script de shell.
  "${SSH[@]}" ubuntu@$HOST_IP "sudo systemd-run --wait --pipe --quiet -p EnvironmentFile=/etc/pontos-fortes/runtime.env -p WorkingDirectory=/opt/pontos-fortes/current/backend /opt/pontos-fortes/current/backend/.venv/bin/python -m app.seed_cliente_teste --allow-prod --password-file /root/cliente-teste.txt"
  mkdir -p .runtime/infra && umask 077
  "${SSH[@]}" ubuntu@$HOST_IP "sudo cat /root/cliente-teste.txt" > .runtime/infra/cliente-teste.txt
  echo "Contas do cliente teste em .runtime/infra/cliente-teste.txt"
else
  echo "4/5 cliente teste: pulado (use --seed-cliente-teste)"
fi

echo "5/5 checagem"
curl -fsS -o /dev/null -w "/ %{http_code}\n" "https://$DOMAIN/"
curl -fsS -o /dev/null -w "/moe %{http_code}\n" "https://$DOMAIN/moe"
curl -fsS -o /dev/null -w "/office-engine %{http_code}\n" "https://$DOMAIN/office-engine/index.html"
curl -fsS "https://$DOMAIN/api/v1/health"; echo
