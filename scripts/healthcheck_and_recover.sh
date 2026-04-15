#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL="http://127.0.0.1:8010/health"
FRONTEND_URL="http://127.0.0.1:4173"

log() {
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $1" >> /home/iiitd/projects/FCS/backend/watchdog.log
}

if ! curl -fsS --max-time 5 "$BACKEND_URL" >/dev/null; then
  log "backend health check failed; restarting careerbridge-backend"
  systemctl restart careerbridge-backend
fi

if ! curl -fIsS --max-time 5 "$FRONTEND_URL" >/dev/null; then
  log "frontend health check failed; restarting careerbridge-frontend"
  systemctl restart careerbridge-frontend
fi
