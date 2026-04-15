# CareerBridge Systemd Setup

This ensures the app auto-starts on VM boot and auto-restarts if a process crashes.

## 1. Copy service files to systemd directory

SSH to the VM and run:

```bash
sudo cp ~/projects/FCS/scripts/careerbridge-backend.service /etc/systemd/system/
sudo cp ~/projects/FCS/scripts/careerbridge-frontend.service /etc/systemd/system/
```

## 2. Reload systemd and enable services

```bash
sudo systemctl daemon-reload
sudo systemctl enable careerbridge-backend
sudo systemctl enable careerbridge-frontend
```

## 3. Start services immediately

```bash
sudo systemctl start careerbridge-backend
sudo systemctl start careerbridge-frontend
```

## 4. Verify status

```bash
sudo systemctl status careerbridge-backend
sudo systemctl status careerbridge-frontend
```

## 5. View live logs

```bash
# Backend
tail -f ~/projects/FCS/backend/backend.log

# Frontend
tail -f ~/projects/FCS/frontend/frontend.log
```

## 6. Manual control (if needed)

```bash
# Stop
sudo systemctl stop careerbridge-backend
sudo systemctl stop careerbridge-frontend

# Restart
sudo systemctl restart careerbridge-backend
sudo systemctl restart careerbridge-frontend

# Tail logs
sudo journalctl -u careerbridge-backend -f
sudo journalctl -u careerbridge-frontend -f
```

## 7. After VM restart

Both services will automatically start. Check:

```bash
curl -sS http://127.0.0.1:8010/health
curl -I http://127.0.0.1:4173
```

## Notes

- Services depend on `.env` file at `/home/iiitd/projects/FCS/.env`
- Logs go to `/home/iiitd/projects/FCS/{backend,frontend}/{backend,frontend}.log`
- Backend restarts immediately if it crashes; frontend waits 10s before retry
- Frontend waits for backend to be ready before starting (Wants/After)
