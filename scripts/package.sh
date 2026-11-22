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
cp -r frontend/.next/standalone/. "$STAGE/frontend/"
mkdir -p "$STAGE/frontend/.next" && cp -r frontend/.next/static "$STAGE/frontend/.next/static"
[ -d frontend/public ] && cp -r frontend/public "$STAGE/frontend/public"
cp deploy/pf-api.service deploy/pf-web.service deploy/nginx.conf deploy/install.sh "$STAGE/deploy/"
find "$STAGE" -name '__pycache__' -prune -exec rm -rf {} +
tar -czf "$OUT/pontos-fortes.tar.gz" -C "$STAGE" .
sha256sum "$OUT/pontos-fortes.tar.gz" | tee "$OUT/pontos-fortes.sha256"
rm -rf "$STAGE"
