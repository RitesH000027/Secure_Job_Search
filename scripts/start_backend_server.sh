#!/usr/bin/env bash
set -euo pipefail

cd ~/projects/FCS

echo "Syncing backend repo (fast-forward only)..."
git pull --ff-only

if [[ ! -f ".env" ]]; then
  echo "Missing ~/projects/FCS/.env"
  echo "Create it first and set SECRET_KEY, DATABASE_URL, ENCRYPTION_KEY, REDIS_URL"
  exit 1
fi

echo "Loading environment from ~/projects/FCS/.env..."
set -a
source .env
set +a

cd backend

if [[ ! -d ".venv" ]]; then
  echo "Missing .venv in ~/projects/FCS/backend"
  echo "Create it first: python3 -m venv .venv"
  exit 1
fi

if [[ -f "../requirements.txt" ]]; then
  echo "Installing/updating Python dependencies from requirements.txt..."
  ./.venv/bin/python -m pip install -r ../requirements.txt
else
  echo "Missing ../requirements.txt. Cannot install dependencies."
  exit 1
fi

# optional: kill old process on 8010
fuser -k 8010/tcp >/dev/null 2>&1 || true

echo "Starting backend on 0.0.0.0:8010"
./.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8010
