#!/usr/bin/env bash
# Gera .runtime/releases/pontos-fortes.tar.gz: backend (sem venv/.env/banco) + Next standalone + deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=.runtime/releases; STAGE=$(mktemp -d)
mkdir -p "$OUT"
(cd frontend && npm ci --silent && npm run build)
mkdir -p "$STAGE/backend" "$STAGE/frontend" "$STAGE/deploy"
cp -r backend/app "$STAGE/backend/"
backend/.venv/bin/pip freeze --exclude-editable | grep -v '^pytest\|^pluggy\|^iniconfig' > "$STAGE/backend/requirements.lock"
# Com outputFileTracingRoot na raiz do repo, o Next aninha o servidor em standalone/frontend/.
SA=frontend/.next/standalone; [ -f "$SA/frontend/server.js" ] && SA="$SA/frontend"
cp -r "$SA/." "$STAGE/frontend/"
test -f "$STAGE/frontend/server.js" || { echo "server.js ausente no pacote" >&2; exit 1; }
mkdir -p "$STAGE/frontend/.next" && cp -r frontend/.next/static "$STAGE/frontend/.next/static"
[ -d frontend/public ] && cp -r frontend/public "$STAGE/frontend/public"
cp deploy/pf-api.service deploy/pf-web.service deploy/nginx.conf deploy/install.sh "$STAGE/deploy/"
find "$STAGE" -name '__pycache__' -prune -exec rm -rf {} +
tar -czf "$OUT/pontos-fortes.tar.gz" -C "$STAGE" .
sha256sum "$OUT/pontos-fortes.tar.gz" | tee "$OUT/pontos-fortes.sha256"
rm -rf "$STAGE"
