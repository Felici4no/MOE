#!/usr/bin/env bash
# Leva só as variáveis STRIPE_* de ~/.config/pontos-fortes/stripe.env para /etc/pontos-fortes/runtime.env na VM
# e reinicia a API. Recusa chave que não seja de teste. Os valores nunca aparecem na saída.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${PF_STRIPE_ENV_FILE:-$HOME/.config/pontos-fortes/stripe.env}"
HOST="${PF_VM:-ubuntu@23.21.15.247}"
SSH=(ssh -i .runtime/infra/ssh-key -o UserKnownHostsFile=.runtime/infra/known_hosts -o StrictHostKeyChecking=yes "$HOST")

test -f "$SRC" || { echo "Crie $SRC com STRIPE_SECRET_KEY=sk_test_… e STRIPE_WEBHOOK_SECRET=whsec_…" >&2; exit 1; }
if grep -q '^STRIPE_SECRET_KEY=' "$SRC" && ! grep -q '^STRIPE_SECRET_KEY=sk_test_' "$SRC"; then
  echo "STRIPE_SECRET_KEY não é de teste (sk_test_); nada foi enviado." >&2; exit 1
fi
grep -q '^STRIPE_SECRET_KEY=sk_test_' "$SRC" || echo "Aviso: sem STRIPE_SECRET_KEY; os pagamentos seguem desligados." >&2
LINES=$(grep -E '^STRIPE_(SECRET_KEY|WEBHOOK_SECRET|AUTOMATIC_TAX)=' "$SRC")

# Substitui as linhas STRIPE_* do runtime.env, preservando todo o resto.
printf '%s\n' "$LINES" | "${SSH[@]}" 'set -e
  new=$(mktemp); trap "shred -u $new" EXIT; cat > "$new"
  sudo cp -p /etc/pontos-fortes/runtime.env /etc/pontos-fortes/runtime.env.bak
  { sudo grep -vE "^STRIPE_(SECRET_KEY|WEBHOOK_SECRET|AUTOMATIC_TAX)=" /etc/pontos-fortes/runtime.env; cat "$new"; } | sudo tee /etc/pontos-fortes/runtime.env.new >/dev/null
  sudo install -m 640 -o root -g pf-api /etc/pontos-fortes/runtime.env.new /etc/pontos-fortes/runtime.env
  sudo shred -u /etc/pontos-fortes/runtime.env.new
  sudo systemctl restart pf-api; sleep 3
  curl -fsS http://127.0.0.1:8000/api/v1/health; echo'
echo "Variáveis enviadas: $(printf '%s\n' "$LINES" | cut -d= -f1 | tr '\n' ' ')"
