#!/usr/bin/env bash
set -euo pipefail

cd ~/projects/FCS/backend

if [[ ! -d ".venv" ]]; then
  echo "Missing .venv in ~/projects/FCS/backend"
  echo "Create it first: python3 -m venv .venv"
  exit 1
fi

source .venv/bin/activate

# optional: kill old process on 8010
fuser -k 8010/tcp >/dev/null 2>&1 || true

echo "Starting backend on 127.0.0.1:8010"
uvicorn app.main:app --host 127.0.0.1 --port 8010
