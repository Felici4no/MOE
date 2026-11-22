#!/usr/bin/env bash
# Instala/atualiza o Pontos Fortes numa Ubuntu 24.04 limpa. Rodar como root na VM:
#   sudo bash install.sh <release.tar.gz> <host>
# runtime.env precisa estar em /etc/pontos-fortes/runtime.env (600) antes da primeira execução.
set -euo pipefail
PKG="$1"; HOST="$2"
RELEASE="/opt/pontos-fortes/releases/$(date +%Y%m%d%H%M%S)"

if [ -d /opt/receita ] || [ -d /var/lib/receita ]; then echo "Host do Receita; abortando." >&2; exit 1; fi
test -f /etc/pontos-fortes/runtime.env || { echo "Falta /etc/pontos-fortes/runtime.env" >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive
if ! command -v node >/dev/null || ! node -v | grep -q '^v22'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
fi
apt-get update -q
apt-get install -yq python3.12-venv postgresql nginx certbot python3-certbot-nginx nodejs

id pf-api >/dev/null 2>&1 || useradd --system --home /nonexistent --shell /usr/sbin/nologin pf-api
id pf-web >/dev/null 2>&1 || useradd --system --home /nonexistent --shell /usr/sbin/nologin pf-web

# Banco: usuário e base locais; senha vem do runtime.env (PF_DB_PASSWORD).
# Lê só a senha do banco: o arquivo é para o systemd, não um script de shell.
PF_DB_PASSWORD=$(sed -n 's/^PF_DB_PASSWORD=//p' /etc/pontos-fortes/runtime.env | tr -d '"')
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='pontos'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE ROLE pontos LOGIN PASSWORD '${PF_DB_PASSWORD}'"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='pontos'" | grep -q 1 || \
  sudo -u postgres createdb -O pontos pontos

mkdir -p "$RELEASE"
tar -xzf "$PKG" -C "$RELEASE"
python3.12 -m venv "$RELEASE/backend/.venv"
"$RELEASE/backend/.venv/bin/pip" install -q --no-cache-dir -r "$RELEASE/backend/requirements.lock"
chown -R root:root "$RELEASE"; chmod -R go-w,a+rX "$RELEASE"
ln -sfn "$RELEASE" /opt/pontos-fortes/current

install -m 644 "$RELEASE/deploy/pf-api.service" /etc/systemd/system/pf-api.service
install -m 644 "$RELEASE/deploy/pf-web.service" /etc/systemd/system/pf-web.service
sed "s/__HOST__/$HOST/g" "$RELEASE/deploy/nginx.conf" > /etc/nginx/sites-available/pontos-fortes
ln -sfn /etc/nginx/sites-available/pontos-fortes /etc/nginx/sites-enabled/pontos-fortes
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl daemon-reload
systemctl enable --now pf-api pf-web
systemctl restart pf-api pf-web
systemctl reload nginx
if [ ! -d "/etc/letsencrypt/live/$HOST" ]; then
  certbot --nginx -d "$HOST" --non-interactive --agree-tos --register-unsafely-without-email --redirect
else
  # O template acima é só HTTP: reaplica o certificado existente a cada atualização.
  certbot install --nginx --cert-name "$HOST" -d "$HOST" --non-interactive --redirect
fi
for _ in $(seq 1 20); do curl -fsS "http://127.0.0.1:8000/api/v1/health" && echo && break; sleep 1; done
curl -fsS -o /dev/null -w "https %{http_code}\n" --resolve "$HOST:443:127.0.0.1" "https://$HOST/api/v1/health"
echo "Release ativa: $RELEASE"
