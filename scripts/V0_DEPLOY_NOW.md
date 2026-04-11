# v0 Deploy Now (College Server)

## 1) Push latest from local

```bash
git add .
git commit -m "v0 deploy prep"
git push origin master
```

## 2) SSH to college server

```bash
ssh iiitd@<college-server-ip-or-host>
cd ~/projects/FCS
git pull --ff-only
```

## 3) One-time setup (if needed)

```bash
cp .env.example .env
# edit .env with real values (SECRET_KEY, ENCRYPTION_KEY, SMTP_*, DATABASE_URL, CORS_ORIGINS, ALLOWED_HOSTS)
chmod +x scripts/deploy_v0_college_server.sh
chmod +x scripts/start_backend_server.sh
```

## 4) Deploy and start services

```bash
bash scripts/deploy_v0_college_server.sh
```

## 5) Validate quickly

```bash
curl -sS http://127.0.0.1:8010/health
curl -I http://127.0.0.1:4173
```

## 6) Useful logs

```bash
tail -f ~/projects/FCS/backend/backend_v0.log
tail -f ~/projects/FCS/frontend/frontend_v0.log
```

## 7) Stop/restart manually if needed

```bash
fuser -k 8010/tcp
fuser -k 4173/tcp
bash scripts/deploy_v0_college_server.sh
```
