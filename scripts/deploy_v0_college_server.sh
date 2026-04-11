#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$HOME/projects/FCS"
BACKEND_PORT="8010"
FRONTEND_PORT="4173"

cd "$REPO_ROOT"

echo "[v0] Pulling latest code..."
git pull --ff-only

echo "[v0] Preparing backend environment..."
cd "$REPO_ROOT/backend"
if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi
./.venv/bin/python -m pip install -r ../requirements.txt

if [[ ! -f "$REPO_ROOT/.env" ]]; then
  echo "[v0][error] Missing $REPO_ROOT/.env"
  echo "Copy from .env.example and set production values first."
  exit 1
fi

echo "[v0] Restarting backend on 127.0.0.1:${BACKEND_PORT}..."
fuser -k "${BACKEND_PORT}/tcp" >/dev/null 2>&1 || true
nohup ./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" > "$REPO_ROOT/backend/backend_v0.log" 2>&1 &

echo "[v0] Building frontend..."
cd "$REPO_ROOT/frontend"
npm install
npm run build

echo "[v0] Restarting frontend preview on 0.0.0.0:${FRONTEND_PORT}..."
fuser -k "${FRONTEND_PORT}/tcp" >/dev/null 2>&1 || true
nohup npm run preview -- --host 0.0.0.0 --port "$FRONTEND_PORT" > "$REPO_ROOT/frontend/frontend_v0.log" 2>&1 &

echo "[v0] Waiting briefly for services to come up..."
sleep 2

echo "[v0] Backend health check:"
curl -sS "http://127.0.0.1:${BACKEND_PORT}/health" || true

echo

echo "[v0] Frontend check (HTTP status):"
curl -I -sS "http://127.0.0.1:${FRONTEND_PORT}" | head -n 1 || true

echo "[v0] Done."
echo "Backend log:  $REPO_ROOT/backend/backend_v0.log"
echo "Frontend log: $REPO_ROOT/frontend/frontend_v0.log"
