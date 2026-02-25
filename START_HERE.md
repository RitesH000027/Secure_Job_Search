# VM Setup Instructions - START HERE

## Step 1: Connect to VM

Open a new terminal (Git Bash, WSL, or PowerShell with OpenSSH) and connect:

```bash
ssh iiitd@192.168.3.40
# Password: K0Rt!<6c
```

## Step 2: Copy Setup Scripts to VM

From your local machine, copy the setup scripts:

```bash
# From your FCS directory
scp vm-setup.sh db-setup.sh ssl-setup.sh project-setup.sh iiitd@192.168.3.40:~/
```

Or manually create them on the VM using `nano` and copy-paste the content.

## Step 3: Run Setup Scripts (On VM)

Once connected to the VM:

### 3.1 System & Software Installation
```bash
chmod +x vm-setup.sh
./vm-setup.sh
```
**Expected time**: 5-10 minutes  
**What it does**: Installs Python, PostgreSQL, Nginx, Git, Redis

### 3.2 Database Setup
```bash
chmod +x db-setup.sh
./db-setup.sh
```
**Expected time**: 1 minute  
**What it does**: Creates database `job_platform` and user `job_user`  
**Save these credentials** for your .env file!

### 3.3 SSL Certificate Generation
```bash
chmod +x ssl-setup.sh
sudo ./ssl-setup.sh
```
**Expected time**: 30 seconds  
**What it does**: Creates self-signed SSL certificate for HTTPS

### 3.4 Project Repository Setup
```bash
chmod +x project-setup.sh
./project-setup.sh
# When prompted, enter your Git repo URL
```
**Expected time**: 2-3 minutes  
**What it does**: Clones repo, creates venv, installs dependencies

## Step 4: Update Environment Variables

```bash
cd ~/projects/FCS
nano .env
```

Update these critical values:
```bash
SECRET_KEY=<copy from output of project-setup.sh>
DATABASE_URL=postgresql://job_user:SecureJobPass2026!@localhost:5432/job_platform
ENCRYPTION_KEY=<copy from output of project-setup.sh>
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

## Step 5: Create Backend Structure

```bash
cd ~/projects/FCS
mkdir -p backend/app/{models,schemas,routers,services,utils,middleware}
mkdir -p backend/uploads
touch backend/app/__init__.py
```

## Step 6: Create Main FastAPI App

```bash
nano backend/app/main.py
```

Paste this minimal app (or use the version from SETUP_GUIDE.md):

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Secure Job Platform", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Secure Job Platform API", "status": "operational"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "not_connected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

Save and exit.

## Step 7: Test FastAPI App

```bash
cd ~/projects/FCS
source venv/bin/activate
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

In another terminal (or from your local machine):
```bash
curl http://192.168.3.40:8000/
# Should return: {"message":"Secure Job Platform API","status":"operational"}
```

Press `Ctrl+C` to stop the server.

## Step 8: Configure Nginx (Next Steps)

After confirming the app works, we'll:
1. Configure Nginx as reverse proxy
2. Enable HTTPS
3. Set up systemd service for auto-start

---

## Quick Reference Commands

**Activate virtual environment:**
```bash
cd ~/projects/FCS
source venv/bin/activate
```

**Run development server:**
```bash
cd ~/projects/FCS/backend
source ../venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Check service status:**
```bash
sudo systemctl status postgresql
sudo systemctl status nginx
sudo systemctl status redis-server
```

**View logs:**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## Troubleshooting

**Can't connect to VM:**
- Check if VM is running
- Verify IP: `ping 192.168.3.40`
- Check firewall settings

**PostgreSQL won't start:**
```bash
sudo systemctl status postgresql
sudo journalctl -u postgresql -n 50
```

**Permission denied errors:**
```bash
sudo chown -R iiitd:iiitd ~/projects/FCS
```

**Port 8000 already in use:**
```bash
sudo lsof -i :8000
sudo kill -9 <PID>
```

---

## Progress Checklist

- [ ] SSH into VM successful
- [ ] System updated and software installed
- [ ] PostgreSQL database created
- [ ] SSL certificates generated
- [ ] Project cloned on VM
- [ ] Virtual environment created
- [ ] Dependencies installed
- [ ] .env file configured
- [ ] FastAPI app running on port 8000
- [ ] Can access http://192.168.3.40:8000

**Next**: Configure Nginx and HTTPS (tomorrow's task)

---

**Need help?** Refer to SETUP_GUIDE.md for detailed explanations of each step.
