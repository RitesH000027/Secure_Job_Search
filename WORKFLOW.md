# Project Workflow & Milestone Roadmap

**Current Date**: February 7, 2026  
**Project**: Secure Job Search & Professional Networking Platform

---

## 🎯 Milestone 1: February 13, 2026 (6 days) [No Credit - Setup]

### Objective
Set up development environment, tech stack, and deploy skeleton application with HTTPS.

### Tasks

#### Week 1 (Feb 7-13)

**Day 1-2: Environment Setup**
- [ ] Set up Ubuntu VM (provided)
- [ ] Install PostgreSQL database
- [ ] Install Nginx web server
- [ ] Install Python 3.10+ and pip
- [ ] Create virtual environment
- [ ] Install base dependencies from `requirements.txt`

**Day 3-4: HTTPS Configuration**
- [ ] Generate self-signed SSL certificate OR obtain CA-issued cert
- [ ] Configure Nginx as reverse proxy with HTTPS
- [ ] Test HTTPS connection
- [ ] Set up auto-redirect HTTP → HTTPS

**Day 5-6: Skeleton Application**
- [ ] Initialize FastAPI project structure
- [ ] Create basic health check endpoint (`/health`)
- [ ] Set up database connection
- [ ] Create initial database schema (users table)
- [ ] Deploy to VM and verify accessibility via HTTPS
- [ ] Create basic landing page (HTML/React stub)

### Deliverables
✅ Working HTTPS endpoint  
✅ Basic FastAPI app responding to requests  
✅ PostgreSQL connected  
✅ Git repository initialized

---

## 🎯 Milestone 2: February 27, 2026 (20 days) [2.5%]

### Objective
Implement secure authentication, user profiles, resume upload, and basic admin dashboard.

### Week 2 (Feb 14-20)

**Authentication & Registration**
- [ ] Design user database schema (users, otp_tokens, sessions)
- [ ] Implement user registration endpoint
  - Password hashing with bcrypt/Argon2
  - Email validation
- [ ] Implement OTP generation and verification
  - Email-based OTP (or alternative method)
  - 5-minute expiry
  - Rate limiting
- [ ] Create OTP verification endpoint
- [ ] Implement login endpoint with JWT tokens
- [ ] Add session management (access + refresh tokens)
- [ ] Implement logout functionality

**Frontend - Auth Pages**
- [ ] Registration form with validation
- [ ] Login form
- [ ] OTP input page
- [ ] Password reset flow

### Week 3 (Feb 21-27)

**User Profile Management**
- [ ] Design profile schema (name, headline, location, education, experience, skills, bio)
- [ ] Implement profile CRUD endpoints
- [ ] Add profile picture upload
- [ ] Implement field-level privacy controls (Public, Connections-only, Private)
- [ ] Create profile view/edit pages

**Secure Resume Upload**
- [ ] Design resume storage schema
- [ ] Implement file upload endpoint (PDF/DOCX only)
- [ ] Add file type validation
- [ ] Implement at-rest encryption for resumes using `cryptography`
- [ ] Create access control: owner + authorized recruiters only
- [ ] Add resume download endpoint with decryption
- [ ] Store encrypted files on filesystem or encrypted blob

**Basic Admin Dashboard**
- [ ] Implement RBAC schema (roles: User, Recruiter, Admin)
- [ ] Create admin endpoints to list users
- [ ] Add suspend/delete user functionality
- [ ] Build simple admin UI

### Deliverables
✅ Secure registration with OTP  
✅ Login with JWT  
✅ User profile CRUD with privacy settings  
✅ Encrypted resume upload/download  
✅ Admin can view and manage users  
✅ All passwords hashed, never stored in plaintext

---

## 🎯 Milestone 3: March 31, 2026 (32 days) [2.5%]

### Objective
Build company pages, job postings, application workflow, encrypted messaging, and audit logging.

### Week 4-5 (Feb 28 - Mar 13)

**Company Pages & Job Postings**
- [ ] Design company schema (name, description, location, website)
- [ ] Implement company creation endpoint (Recruiter role required)
- [ ] Add company edit/delete endpoints
- [ ] Design job posting schema (title, description, skills, location, salary, deadline)
- [ ] Implement job posting CRUD endpoints
- [ ] Add company admin management (assign recruiters to companies)

**Job Search & Application**
- [ ] Implement job search endpoint with filters:
  - Keywords, company, location, skills
  - Remote/on-site, internship/full-time
- [ ] Create application schema (user, job, resume, cover note, status)
- [ ] Implement job application endpoint
- [ ] Add application status tracking (Applied, Reviewed, Interviewed, Rejected, Offer)
- [ ] Create recruiter endpoints:
  - View applicants for a job
  - Update application status
  - Add notes to applications

**Frontend - Jobs**
- [ ] Company page creation/management UI
- [ ] Job posting form
- [ ] Job search interface with filters
- [ ] Job detail page
- [ ] Application form
- [ ] Application status dashboard (for users)
- [ ] Recruiter dashboard (view/manage applicants)

### Week 6-7 (Mar 14-27)

**Encrypted Messaging**
- [ ] Design messaging schema (conversations, messages, participants)
- [ ] Implement E2EE key exchange:
  - Generate user key pairs (public/private) using `cryptography` or `PyNaCl`
  - Store public keys on server
  - Client-side encryption (or simulate on backend)
- [ ] Create conversation endpoints:
  - Start 1-to-1 or group conversation
  - Send encrypted message (store ciphertext only)
  - Retrieve and decrypt messages
- [ ] Implement message list/detail endpoints
- [ ] Add real-time messaging (optional: WebSocket)

**Frontend - Messaging**
- [ ] Conversation list
- [ ] Message thread view
- [ ] Send message interface
- [ ] E2EE key generation UI flow

### Week 8 (Mar 28-31)

**Initial Audit Logging**
- [ ] Design audit log schema (timestamp, user, action, resource, metadata)
- [ ] Implement logging middleware/decorator
- [ ] Log critical actions:
  - User login/logout
  - Job posting creation/updates
  - Application status changes
  - Admin moderation actions
- [ ] Create admin endpoint to view logs
- [ ] Basic log viewer UI

### Deliverables
✅ Company pages with job postings  
✅ Job search with filters  
✅ Application submission and tracking  
✅ Encrypted messaging (E2EE or server-encrypted)  
✅ Audit logs for critical actions

---

## 🎯 Final Milestone: April 30, 2026 (30 days) [Final Evaluation]

### Objective
Complete PKI integration, OTP virtual keyboard, tamper-evident logs, security hardening, and demo prep.

### Week 9-10 (Apr 1-15)

**PKI Integration (2 Functions Minimum)**
- [ ] Choose PKI use cases:
  1. **Message Signing**: Sign messages with private key, verify with public key
  2. **Resume Integrity**: Sign resume hash on upload, verify on download
  3. **Company Verification**: Issue digital certificates to verified companies
- [ ] Implement chosen PKI functions
- [ ] Add certificate validation
- [ ] Create PKI verification UI indicators

**OTP Virtual Keyboard (2 High-Risk Actions)**
- [ ] Build virtual keyboard component (on-screen clickable keypad)
- [ ] Integrate for high-risk actions:
  1. Password reset
  2. Resume download by recruiters
  3. Account deletion
- [ ] Implement OTP flow with virtual keyboard input
- [ ] Add rate limiting and anti-automation measures

**Tamper-Evident Audit Logs**
- [ ] Implement hash chaining for logs:
  - Each log entry includes hash of previous entry
  - Root hash stored securely
- [ ] OR implement simple private blockchain:
  - Each block contains multiple log entries
  - Chain validated on retrieval
- [ ] Add log integrity verification endpoint
- [ ] Display integrity status in admin UI

### Week 11 (Apr 16-22)

**Security Hardening**
- [ ] **SQL Injection**: Use parameterized queries (already in SQLAlchemy)
- [ ] **XSS Protection**: Sanitize all user inputs, set CSP headers
- [ ] **CSRF Protection**: Implement CSRF tokens for state-changing operations
- [ ] **Session Security**:
  - Implement session fixation protection (regenerate session ID on login)
  - Add session hijacking defenses (bind to IP/user-agent, short expiry)
  - Implement secure cookie flags (HttpOnly, Secure, SameSite)
- [ ] Add rate limiting on all endpoints
- [ ] Implement input validation on all endpoints
- [ ] Add security headers (HSTS, X-Frame-Options, etc.)

**Professional Connections**
- [ ] Design connection schema (user relationships)
- [ ] Implement send/accept/remove connection requests
- [ ] Add connection-based privacy filtering for profiles
- [ ] Implement limited connection graph view
- [ ] Add profile viewer tracking (with opt-out)

### Week 12 (Apr 23-30)

**Testing & Documentation**
- [ ] Test all security features:
  - Try SQL injection attacks
  - Test XSS vulnerabilities
  - Verify CSRF protection
  - Test session management
- [ ] Load testing (concurrent users)
- [ ] Write comprehensive documentation:
  - Architecture overview
  - Security implementations
  - API documentation
  - Deployment guide
  - User manual
- [ ] Prepare demo script
- [ ] Record demo video

**Bonus Features (Optional)**
- [ ] Blockchain-based logging (+6%)
- [ ] Resume parsing with NLP (+2%)
- [ ] Intelligent job matching

### Deliverables
✅ PKI in ≥2 security functions  
✅ Virtual keyboard for ≥2 high-risk OTP actions  
✅ Tamper-evident audit logs with verification  
✅ Protection against SQL injection, XSS, CSRF, session attacks  
✅ Complete connection/networking features  
✅ Full documentation  
✅ Working demo  

---

## 📋 Continuous Tasks (Throughout Project)

**Version Control**
- Commit regularly with meaningful messages
- Use feature branches
- Tag releases at each milestone

**Security Best Practices**
- Never commit secrets (use `.env` files)
- Regular dependency updates
- Code reviews before merging

**Documentation**
- Update API docs as you build
- Document security decisions
- Keep README current

**Testing**
- Write unit tests for critical functions
- Test authentication flows
- Verify encryption/decryption

---

## 🛠️ Recommended Project Structure

```
FCS/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app
│   │   ├── config.py               # Settings, env vars
│   │   ├── database.py             # DB connection
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── schemas/                # Pydantic schemas
│   │   ├── routers/                # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── jobs.py
│   │   │   ├── messages.py
│   │   │   └── admin.py
│   │   ├── services/               # Business logic
│   │   ├── utils/
│   │   │   ├── security.py         # Hashing, JWT, encryption
│   │   │   ├── otp.py
│   │   │   ├── pki.py
│   │   │   └── audit.py
│   │   └── middleware/             # Auth, logging, CORS
│   ├── alembic/                    # Database migrations
│   ├── tests/
│   └── uploads/                    # Encrypted file storage
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/               # API clients
│   │   └── utils/
│   └── package.json
├── nginx/
│   └── nginx.conf                  # Nginx configuration
├── ssl/
│   ├── cert.pem
│   └── key.pem
├── .env.example
├── requirements.txt
├── requirements-dev.txt
└── README.md
```

---

## 🚀 Quick Start Commands

**Initial Setup**
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Ubuntu

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your settings

# Database setup
psql -U postgres
CREATE DATABASE job_platform;
CREATE USER job_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE job_platform TO job_user;
\q

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Production Deployment**
```bash
# Run with production settings
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Or use gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

## ✅ Success Criteria

**Milestone 1**
- [ ] HTTPS accessible from external browser
- [ ] App responds with 200 OK

**Milestone 2**
- [ ] User can register and login with OTP
- [ ] Resume uploads are encrypted
- [ ] Admin can manage users

**Milestone 3**
- [ ] Jobs can be posted and searched
- [ ] Applications work end-to-end
- [ ] Messages are encrypted

**Final**
- [ ] All security requirements met
- [ ] Demo shows complete workflow
- [ ] No plaintext sensitive data
- [ ] Logs are tamper-evident
- [ ] System handles concurrent users

---

## 🎓 Next Steps

1. **Today (Feb 7)**: Review this workflow, set up Git repo
2. **Feb 8-9**: VM setup, install PostgreSQL, Nginx, Python
3. **Feb 10-11**: Generate SSL certs, configure HTTPS
4. **Feb 12-13**: Deploy skeleton app, test connectivity
5. **Feb 14**: Start Milestone 2 - authentication system

Good luck! 🚀
