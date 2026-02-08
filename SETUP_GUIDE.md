# Quick Setup Guide

## Prerequisites Checklist

- [ ] Ubuntu VM access (provided by course)
- [ ] SSH access to VM
- [ ] Domain name or IP address for VM
- [ ] Email service credentials (for OTP emails)

---

## Day 1: Initial VM Setup

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Python 3.10+
```bash
sudo apt install python3 python3-pip python3-venv -y
python3 --version  # Verify ≥ 3.10
```

### 3. Install PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4. Create Database and User
```bash
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE DATABASE job_platform;
CREATE USER job_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE job_platform TO job_user;
ALTER DATABASE job_platform OWNER TO job_user;
\q
```

### 5. Install Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 6. Install Git
```bash
sudo apt install git -y
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## Day 2: Project Setup

### 1. Clone or Initialize Project
```bash
cd ~
mkdir -p projects
cd projects
git clone <your-repo-url> FCS
# OR
mkdir FCS && cd FCS && git init
```

### 2. Create Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Create Environment File
```bash
cat > .env << 'EOF'
# Application
APP_NAME="Secure Job Platform"
DEBUG=False
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=postgresql://job_user:your_secure_password_here@localhost:5432/job_platform

# Email (OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourplatform.com

# File Storage
UPLOAD_DIR=/home/ubuntu/projects/FCS/uploads
MAX_UPLOAD_SIZE=10485760  # 10MB

# Encryption
ENCRYPTION_KEY=generate-this-with-cryptography-fernet
EOF
```

### 5. Generate Encryption Key
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Copy output and update ENCRYPTION_KEY in .env
```

### 6. Generate Secret Key
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# Copy output and update SECRET_KEY in .env
```

---

## Day 3-4: HTTPS Configuration

### Option A: Self-Signed Certificate (Development)

```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl
cd /etc/nginx/ssl

# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/nginx-selfsigned.key \
  -out /etc/nginx/ssl/nginx-selfsigned.crt

# You'll be prompted for:
# - Country: IN
# - State: Your State
# - City: Your City
# - Organization: Your University
# - Common Name: your-vm-ip-or-domain
# - Email: your email
```

### Option B: Let's Encrypt (Production - requires domain)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
# Follow prompts
```

### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/job-platform
```

Paste:
```nginx
upstream fastapi_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name your-vm-ip-or-domain;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-vm-ip-or-domain;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/nginx-selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx-selfsigned.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client body size (for file uploads)
    client_max_body_size 10M;

    # Proxy to FastAPI
    location / {
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (if serving directly)
    location /static/ {
        alias /home/ubuntu/projects/FCS/static/;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/job-platform /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

---

## Day 5: FastAPI Skeleton App

### Create Basic Structure
```bash
cd ~/projects/FCS
mkdir -p backend/app/{models,schemas,routers,services,utils,middleware}
mkdir -p backend/uploads
touch backend/app/__init__.py
```

### Create Main App
```bash
nano backend/app/main.py
```

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Secure Job Platform",
    description="Professional networking with end-to-end security",
    version="0.1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Secure Job Platform API", "status": "operational"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Test Locally
```bash
source venv/bin/activate
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Visit: `https://your-vm-ip/` (accept self-signed cert warning)

---

## Day 6: Database Connection & Models

### Setup Alembic
```bash
cd ~/projects/FCS/backend
alembic init alembic
```

### Configure Database
```bash
nano backend/app/database.py
```

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Create Initial User Model
```bash
nano backend/app/models/user.py
```

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from app.database import Base
from datetime import datetime
import enum

class UserRole(str, enum.Enum):
    USER = "user"
    RECRUITER = "recruiter"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(Enum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### Run Migration
```bash
# Update alembic.ini with your DATABASE_URL
nano alembic.ini
# Set: sqlalchemy.url = postgresql://job_user:password@localhost:5432/job_platform

# Update alembic/env.py
nano alembic/env.py
# Add: from app.models.user import Base
# Update: target_metadata = Base.metadata

# Create migration
alembic revision --autogenerate -m "Initial user model"
alembic upgrade head
```

### Verify
```bash
psql -U job_user -d job_platform -c "\dt"
# Should show 'users' table
```

---

## Run Application with Systemd (Production)

### Create Service File
```bash
sudo nano /etc/systemd/system/job-platform.service
```

```ini
[Unit]
Description=Secure Job Platform API
After=network.target postgresql.service

[Service]
Type=notify
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/projects/FCS/backend
Environment="PATH=/home/ubuntu/projects/FCS/venv/bin"
ExecStart=/home/ubuntu/projects/FCS/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

### Enable and Start
```bash
sudo systemctl daemon-reload
sudo systemctl enable job-platform
sudo systemctl start job-platform
sudo systemctl status job-platform
```

---

## Verification Checklist

- [ ] VM accessible via SSH
- [ ] PostgreSQL running and database created
- [ ] Nginx serving on port 443 (HTTPS)
- [ ] HTTP redirects to HTTPS
- [ ] FastAPI app running on port 8000
- [ ] `/health` endpoint returns 200
- [ ] Database connection works
- [ ] Can create users table
- [ ] Virtual environment activated
- [ ] All dependencies installed

---

## Troubleshooting

**Nginx won't start**
```bash
sudo nginx -t  # Check config syntax
sudo tail -f /var/log/nginx/error.log
```

**PostgreSQL connection failed**
```bash
sudo systemctl status postgresql
psql -U job_user -d job_platform  # Test connection
```

**Port 8000 already in use**
```bash
sudo lsof -i :8000
sudo kill -9 <PID>
```

**Firewall blocking**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

Ready to start Milestone 2! 🎉
