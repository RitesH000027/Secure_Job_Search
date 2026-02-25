# Milestone 1 Report
## Secure Job Search & Professional Networking Platform

**Submitted By:** [Your Name/Team]  
**Date:** February 13, 2026  
**Course:** Foundations of Computer Security (FCS)  
**VM Details:** 192.168.3.40 (fcs22)

---

## 1. Technology Stack Finalization

After researching various options and considering the project requirements, we have finalized the following technology stack:

### ✅ Currently Implemented & Confirmed

**Backend Framework:**
- **FastAPI (Python)** - Version 0.128.5
- **Why we chose this:** 
  - FastAPI automatically generates interactive API documentation (Swagger UI), which will be really helpful for testing
  - It's async by default, so it should handle multiple users well
  - Built-in request validation saves us from writing a lot of error-checking code
  - Good documentation and community support for learning

**Database:**
- **PostgreSQL 14.x** - Running on VM
- **SQLAlchemy 2.0.46** - ORM for database operations
- **Alembic 1.18.3** - For managing database schema changes
- **Why PostgreSQL:**
  - It's what the course recommended, and it has strong security features
  - Supports encryption which we'll need for storing sensitive data
  - Free and open-source

**Web Server:**
- **Nginx** - Configured as reverse proxy
- **HTTPS with TLS 1.2/1.3** - Self-signed certificate for now
- **Why Nginx:**
  - Easy to configure SSL/TLS
  - Good for serving as a reverse proxy to our FastAPI app
  - Lots of online tutorials available

**Operating System:**
- **Ubuntu 22.04.5 LTS** - Provided by course
- **Python 3.10.12** - Pre-installed on the VM

**Process Management:**
- **systemd** - To keep our app running automatically

### 📦 Installed & Ready to Use (For Upcoming Milestones)

These packages are already installed in our virtual environment and ready for implementation:

**For Authentication & Security:**
- `bcrypt` / `argon2-cffi` - Password hashing (will use in Milestone 2)
- `python-jose[cryptography]` - JWT token generation
- `pyotp` - OTP generation for 2FA
- `passlib` - Password utility library

**For Encryption:**
- `cryptography` - File encryption (for resumes)
- `PyNaCl` - End-to-end encryption for messages
- `python-dotenv` - Environment variable management

**For File Handling:**
- `python-multipart` - File uploads
- `aiofiles` - Async file operations
- `PyPDF2` - PDF processing
- `python-docx` - Word document processing
- `Pillow` - Image processing for profile pictures

**For Email & Background Tasks:**
- `fastapi-mail` - Sending OTP emails
- `redis` - Caching and session storage
- `celery` - Background task processing (if needed)

**For Resume Parsing (Bonus Feature):**
- `spacy` - NLP library
- `transformers` - For intelligent resume parsing

### 📋 Technology Stack Summary

| Component | Technology | Status | Purpose |
|-----------|-----------|--------|---------|
| **OS** | Ubuntu 22.04.5 LTS | ✅ Running | Server platform |
| **Language** | Python 3.10.12 | ✅ Installed | Application code |
| **Backend** | FastAPI 0.128.5 | ✅ Deployed | REST API framework |
| **Database** | PostgreSQL 14.x | ✅ Configured | Data storage |
| **Web Server** | Nginx | ✅ Running | Reverse proxy, SSL |
| **Protocol** | HTTPS (TLS 1.3) | ✅ Active | Secure communication |
| **ORM** | SQLAlchemy 2.0.46 | ✅ Installed | Database operations |
| **Cache** | Redis 7.1.0 | ✅ Running | Session/rate limiting |
| **Auth** | JWT + OTP | 📦 Ready | Will implement in M2 |
| **Encryption** | Fernet, PyNaCl | 📦 Ready | File/message encryption |
| **Migrations** | Alembic 1.18.3 | 📦 Ready | Database versioning |

**Legend:**
- ✅ = Already implemented and working
- 📦 = Installed and ready to use in next milestones

---

## 2. HTTPS Configuration with Self-Signed Certificates

### Certificate Generation Process

**Command Used:**
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/job-platform.key \
  -out /etc/nginx/ssl/job-platform.crt \
  -subj "/C=IN/ST=Delhi/L=Delhi/O=IIIT-Delhi/OU=FCS/CN=192.168.3.40"
```

### Certificate Details
- **Type:** Self-signed X.509 certificate
- **Key Size:** RSA 2048-bit
- **Validity:** 365 days
- **Location:** `/etc/nginx/ssl/`
- **Files:**
  - Certificate: `job-platform.crt` (1.4K)
  - Private Key: `job-platform.key` (1.7K, mode 600)

### Nginx SSL Configuration

**SSL Settings Implemented:**
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
```

**Security Headers Added:**
```nginx
Strict-Transport-Security: "max-age=31536000; includeSubDomains"
X-Frame-Options: "SAMEORIGIN"
X-Content-Type-Options: "nosniff"
X-XSS-Protection: "1; mode=block"
```

**HTTP to HTTPS Redirect:**
```nginx
server {
    listen 80;
    server_name 192.168.3.40;
    return 301 https://$server_name$request_uri;
}
```

### Screenshots Required

**Screenshot 1: SSL Certificate Files**
```
Command: ls -lh /etc/nginx/ssl/
Shows: job-platform.crt and job-platform.key with proper permissions
```

**Screenshot 2: Nginx Configuration Test**
```
Command: sudo nginx -t
Shows: Configuration test successful
```

**Screenshot 3: HTTPS Access in Browser**
```
URL: https://192.168.3.40/
Shows: API response with "Not secure" warning (expected for self-signed cert)
```

**Screenshot 4: SSL/TLS Details**
```
Browser: Click on "Not secure" → Certificate details
Shows: Self-signed certificate information, TLS 1.3, RSA 2048
```

**Screenshot 5: HTTP to HTTPS Redirect**
```
URL: http://192.168.3.40/
Shows: Automatic redirect to https://192.168.3.40/
```

---

## 3. Skeleton Application Deployment

### Application Structure

```
/home/iiitd/projects/FCS/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── models/              # Database models (ready for next phase)
│   │   ├── schemas/             # Pydantic schemas (ready for next phase)
│   │   ├── routers/             # API endpoints (ready for next phase)
│   │   ├── services/            # Business logic (ready for next phase)
│   │   ├── utils/               # Utilities (ready for next phase)
│   │   └── middleware/          # Auth, logging (ready for next phase)
│   └── uploads/                 # Encrypted file storage
├── venv/                        # Python virtual environment
├── .env                         # Environment variables
├── requirements.txt             # Dependencies
└── requirements-dev.txt         # Dev tools
```

### Deployed Endpoints

**1. Root Endpoint - GET /**
```json
Response:
{
  "message": "Secure Job Platform API",
  "status": "operational",
  "version": "0.1.0"
}
```

**2. Health Check - GET /health**
```json
Response:
{
  "status": "healthy",
  "database": "not_connected",
  "services": {
    "api": "running",
    "postgresql": "pending",
    "redis": "pending"
  }
}
```

**3. API Documentation - GET /docs**
- Interactive Swagger UI available
- Auto-generated from FastAPI code
- Allows testing endpoints directly

### Database Setup

**Database Created:**
- Name: `job_platform`
- User: `job_user`
- Password: Securely stored in `.env`
- Connection String: `postgresql://job_user:***@localhost:5432/job_platform`

**Status:** Ready for schema creation in Milestone 2

### Systemd Service Configuration

**Service Name:** `job-platform.service`

**Configuration:**
```ini
[Unit]
Description=Secure Job Platform API
After=network.target postgresql.service

[Service]
Type=simple
User=iiitd
WorkingDirectory=/home/iiitd/projects/FCS/backend
ExecStart=/home/iiitd/projects/FCS/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
```

**Service Status:** Active (running) with auto-restart enabled

### Screenshots Required

**Screenshot 6: Project Structure**
```
Command: tree -L 3 ~/projects/FCS/backend/
Shows: Complete directory structure
```

**Screenshot 7: Systemd Service Status**
```
Command: sudo systemctl status job-platform
Shows: Active (running) with worker processes
```

**Screenshot 8: Root Endpoint Response**
```
URL: https://192.168.3.40/
Shows: JSON response with API information
```

**Screenshot 9: Health Check Endpoint**
```
URL: https://192.168.3.40/health
Shows: Service health status
```

**Screenshot 10: API Documentation (Swagger UI)**
```
URL: https://192.168.3.40/docs
Shows: Interactive API documentation with endpoints listed
```

**Screenshot 11: Database Connection**
```
Command: sudo -u postgres psql -c "\l" | grep job_platform
Shows: Database created and owned by job_user
```

**Screenshot 12: Virtual Environment & Dependencies**
```
Command: source venv/bin/activate && pip list | head -20
Shows: Installed packages (FastAPI, SQLAlchemy, etc.)
```

---

## 4. Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Client Browser                   │
│         (Any Device)                     │
└──────────────┬──────────────────────────┘
               │ HTTPS (Port 443)
               │ TLS 1.2/1.3 Encrypted
               ▼
┌─────────────────────────────────────────┐
│         Nginx Web Server                 │
│  • SSL/TLS Termination                  │
│  • Security Headers                     │
│  • Reverse Proxy                        │
│  • HTTP → HTTPS Redirect                │
└──────────────┬──────────────────────────┘
               │ HTTP (localhost:8000)
               ▼
┌─────────────────────────────────────────┐
│      FastAPI Application                 │
│  • 2 Worker Processes                   │
│  • Managed by systemd                   │
│  • Auto-restart on failure              │
│  • Request routing                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      PostgreSQL Database                 │
│  • Database: job_platform               │
│  • Ready for schema creation            │
└─────────────────────────────────────────┘
```

---

## 5. Security Measures Implemented

### Transport Security
✅ HTTPS with TLS 1.2/1.3  
✅ Strong cipher suites  
✅ HTTP to HTTPS redirect  
✅ HSTS header (max-age: 1 year)  

### Application Security
✅ Environment variables for secrets  
✅ No hardcoded credentials  
✅ Proper file permissions (key: 600, cert: 644)  
✅ Service runs as non-root user (iiitd)  

### Infrastructure Security
✅ Nginx reverse proxy (backend not directly exposed)  
✅ Systemd service isolation  
✅ Security headers configured  
✅ File upload size limits (10MB)  

### Prepared for Milestone 2
✅ Structure ready for JWT authentication  
✅ OTP libraries installed  
✅ Encryption libraries ready  
✅ Password hashing libraries ready  

---

## 6. Testing & Verification

### Manual Testing Performed

**Test 1: HTTPS Access**
- ✅ `https://192.168.3.40/` - Success
- ✅ API returns correct JSON response
- ✅ TLS 1.3 connection established

**Test 2: HTTP Redirect**
- ✅ `http://192.168.3.40/` redirects to HTTPS
- ✅ 301 Permanent Redirect status

**Test 3: API Endpoints**
- ✅ Root endpoint operational
- ✅ Health check functional
- ✅ Swagger UI accessible

**Test 4: Service Reliability**
- ✅ Service starts on boot
- ✅ Auto-restarts on failure
- ✅ Multiple workers handling requests

**Test 5: Database Connection**
- ✅ PostgreSQL service running
- ✅ Database created successfully
- ✅ User permissions configured

---

## 7. Challenges Faced & How We Solved Them

### Challenge 1: Database Password with Special Characters
**What happened:** When creating the PostgreSQL user, the password had an `!` character which bash interpreted as a special command (history expansion). Got an error: `bash: !': event not found`

**How we fixed it:** Used a heredoc (`<< EOF`) to pass the SQL commands directly to PostgreSQL without bash interfering. This way the password was treated as literal text.

**Learning:** Special characters need careful handling in bash. Using heredocs is a good solution for multi-line commands with special characters.

### Challenge 2: System Update Prompts
**What happened:** During `sudo apt upgrade`, got interactive dialogs asking which services to restart. It paused the installation waiting for input.

**How we fixed it:** Used Tab key to navigate to "OK" and pressed Enter to continue. Selected the services that needed restarting.

**Learning:** System updates can be interactive. In the future, we can use `-y` flag or `DEBIAN_FRONTEND=noninteractive` for automated scripts.

### Challenge 3: Self-Signed Certificate Warning
**What happened:** Browser shows "Not secure" warning when accessing `https://192.168.3.40/`

**Why this happens:** Self-signed certificates aren't trusted by browsers because they're not verified by a Certificate Authority (CA).

**Solution:** This is expected behavior for self-signed certificates. For development, we click "Advanced" → "Proceed anyway". For production deployment, we plan to use Let's Encrypt (free CA-issued certificate).

**Learning:** Self-signed certs are fine for development/testing but not for production. The encryption still works, browser just doesn't trust the issuer.

### Challenge 4: Understanding the Architecture
**Initial confusion:** Wasn't clear how Nginx, FastAPI, and systemd all fit together.

**How we understood it:**
- FastAPI runs our application code on port 8000 (localhost only)
- Nginx listens on port 443 (HTTPS) and forwards requests to FastAPI
- systemd makes sure FastAPI starts automatically and restarts if it crashes
- Users connect to Nginx (port 443), never directly to FastAPI

**Learning:** This layered approach provides better security - the application isn't directly exposed to the internet.

---

## 8. Next Steps (Milestone 2 - Due Feb 27)

### Planned Features
1. **User Authentication**
   - Registration with email/OTP verification
We successfully completed Milestone 1 on time (actually 5 days early!). All the required deliverables are done and working:

✅ **Technology Stack Finalized** - We researched different options and chose FastAPI + PostgreSQL + Nginx based on project requirements and security needs  

✅ **HTTPS Configured** - Set up SSL/TLS encryption with a self-signed certificate, configured security headers, and enabled TLS 1.3  

✅ **Skeleton Application Deployed** - Got a working FastAPI app running on the VM that auto-starts with systemd and is accessible via HTTPS through Nginx  

### What We Learned:
- How to set up a complete web application infrastructure from scratch
- SSL/TLS certificate generation and configuration
- Nginx reverse proxy setup and security headers
- systemd service management for production deployments
- Environment variable management for secure configuration
- The importance of the layered security approach

### What's Working:
- Users can access our API via `https://192.168.3.40/`
- Interactive API documentation at `/docs`
- Service auto-restarts if it crashes
- HTTP automatically redirects to HTTPS
- All packages installed and ready for next milestone

### Ready for Milestone 2:
We have all the dependencies installed and the project structure set up. We're ready to start implementing user authentication, profile management, and encrypted resume storage in the next phase.

The foundation is solid and we're confident we can build the remaining features on top of this architecture!

3. **Encrypted Resume Storage**
   - PDF/DOCX upload
   - At-rest encryption using Fernet
   - Access control mechanisms

4. **Admin Dashboard**
   - User management interface
   - Role-based access control (RBAC)
   - Basic audit logging

---

## 9. Conclusion

Milestone 1 has been successfully completed **5 days ahead of schedule**. All deliverables have been met:

✅ **Technology Stack Finalized** - Modern, secure stack selected and documented  
✅ **HTTPS Configured** - Self-signed SSL certificate with TLS 1.2/1.3, security headers  
✅ **Skeleton Application Deployed** - FastAPI running on VM with systemd, Nginx reverse proxy  

The foundation is solid and ready for building the full application in subsequent milestones. The architecture follows security best practices and is scalable for future features.

---

## 10. Appendix: Commands Reference

### Start/Stop/Restart Service
```bash
sudo systemctl start job-platform
sudo systemctl stop job-platform
sudo systemctl restart job-platform
sudo systemctl status job-platform
```

### View Logs
```bash
sudo journalctl -u job-platform -f
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Nginx Management
```bash
sudo nginx -t                    # Test configuration
sudo systemctl reload nginx      # Reload config
sudo systemctl restart nginx     # Restart service
```

### Database Access
```bash
sudo -u postgres psql job_platform
PGPASSWORD='***' psql -U job_user -d job_platform -h localhost
```

### Activate Virtual Environment
```bash
cd ~/projects/FCS
source venv/bin/activate
```

---

**Report Prepared By:** [Your Name]  
**Submission Date:** February 13, 2026  
**Project Repository:** https://github.com/RitesH000027/Secure_Job_Search
