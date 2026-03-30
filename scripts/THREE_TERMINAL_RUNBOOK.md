# CareerBridge 3-Terminal Startup

Use these in order.

## Terminal 1 (local PowerShell) - SSH Tunnel

Run from repo root:

powershell -ExecutionPolicy Bypass -File .\scripts\start_tunnel.ps1

Keep this terminal open at all times.

## Terminal 2 (college server shell) - Backend

SSH to server first:

ssh iiitd@192.168.3.40

Then run:

bash ~/projects/FCS/scripts/start_backend_server.sh

If that file is not on server yet, run manually:

cd ~/projects/FCS/backend
source .venv/bin/activate
fuser -k 8010/tcp >/dev/null 2>&1 || true
uvicorn app.main:app --host 127.0.0.1 --port 8010

Keep this terminal open.

## Terminal 3 (local PowerShell) - Frontend

Run from repo root:

powershell -ExecutionPolicy Bypass -File .\scripts\start_frontend.ps1

Open the URL shown by Vite (example: http://localhost:5173).

## Quick health check (local)

Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8010/health

Expected status: 200
