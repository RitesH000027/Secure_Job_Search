# System Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                           │
│  (React/Vue Frontend + E2EE Key Management)                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS (TLS 1.2/1.3)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Nginx Reverse Proxy                         │
│  • SSL/TLS Termination                                          │
│  • Security Headers (HSTS, CSP, X-Frame-Options)                │
│  • Rate Limiting                                                │
│  • Static File Serving                                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP (localhost)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Application                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Middleware Layer                                         │  │
│  │  • CORS                                                  │  │
│  │  • Authentication (JWT)                                  │  │
│  │  • Audit Logging                                         │  │
│  │  • Rate Limiting                                         │  │
│  │  • CSRF Protection                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ API Routers                                              │  │
│  │  /auth     - Registration, Login, OTP, Password Reset    │  │
│  │  /users    - Profile, Connections, Privacy               │  │
│  │  /companies - Company Pages                              │  │
│  │  /jobs     - Postings, Search, Applications              │  │
│  │  /messages - E2EE Messaging                              │  │
│  │  /admin    - User Management, Audit Logs                 │  │
│  │  /resumes  - Upload, Download (Encrypted)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Service Layer (Business Logic)                           │  │
│  │  • Authentication Service                                │  │
│  │  • OTP Service (Generation, Verification)                │  │
│  │  • Encryption Service (Files, Messages)                  │  │
│  │  • PKI Service (Signing, Verification)                   │  │
│  │  • Job Matching Service                                  │  │
│  │  • Audit Service (Hash Chaining)                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────┬───────────────────────────┬────────────────┬────┘
               │                           │                │
               ▼                           ▼                ▼
┌──────────────────────┐  ┌───────────────────────┐  ┌─────────────┐
│   PostgreSQL DB      │  │  Encrypted File Store │  │ Redis Cache │
│                      │  │  (Resumes, Docs)      │  │ (Sessions,  │
│ • Users              │  │                       │  │  Rate Limit)│
│ • Profiles           │  │  /uploads/            │  │             │
│ • Companies          │  │  ├── user_123/        │  └─────────────┘
│ • Jobs               │  │  │   └── resume.enc   │
│ • Applications       │  │  └── ...              │
│ • Messages (E2EE)    │  │                       │
│ • Connections        │  └───────────────────────┘
│ • Audit Logs         │
│ • OTP Tokens         │
└──────────────────────┘
```

---

## Security Architecture

### 1. Authentication & Authorization Flow

```
Registration:
User → Email/Password → Hash Password (bcrypt) → Generate OTP 
  → Send Email → User Enters OTP → Verify → Create Account (is_active=False)
  → Mark Verified → Issue JWT Tokens

Login:
User → Email/Password → Verify Hash → Check is_active → Generate JWT
  → Return Access Token (15 min) + Refresh Token (7 days)

Protected Endpoint:
Request + JWT → Middleware validates → Extract user_id → Check permissions (RBAC)
  → Allow/Deny
```

### 2. Encryption Layers

| Data Type | Encryption Method | Key Storage |
|-----------|-------------------|-------------|
| Passwords | bcrypt/Argon2 (hashed + salted) | N/A (one-way) |
| Resumes | AES-256 (Fernet) | Server `.env` |
| E2EE Messages | Client-side RSA/NaCl | User's private key (client) |
| Database | Transparent Data Encryption (optional) | PostgreSQL config |
| JWT Tokens | HS256 (HMAC-SHA256) | `SECRET_KEY` in `.env` |

### 3. PKI Implementation

**Use Case 1: Message Signing**
```
Sender:
1. Generate message hash (SHA-256)
2. Sign hash with sender's private key
3. Attach signature to message
4. Send encrypted message + signature

Receiver:
1. Decrypt message
2. Verify signature using sender's public key (from server)
3. Confirm message integrity and authenticity
```

**Use Case 2: Resume Integrity Verification**
```
Upload:
1. User uploads resume
2. Generate SHA-256 hash of file
3. Sign hash with user's private key
4. Store: encrypted_file + signature + hash
5. Store signature in DB

Download:
1. Recruiter requests resume
2. Decrypt file
3. Verify signature against stored public key
4. Confirm file hasn't been tampered with
```

### 4. Audit Log Hash Chain

```
Log Entry Structure:
{
  "id": 1,
  "timestamp": "2026-02-07T10:30:00Z",
  "user_id": 123,
  "action": "LOGIN_SUCCESS",
  "resource": "auth",
  "metadata": {"ip": "1.2.3.4"},
  "prev_hash": "0000000000...",
  "current_hash": "a3f2b91c..."
}

Hash Calculation:
current_hash = SHA256(
  prev_hash + timestamp + user_id + action + resource + metadata
)

Verification:
1. Retrieve all logs from DB
2. Recalculate hash for each entry
3. Compare with stored hash
4. If mismatch → log tampering detected
```

---

## Database Schema

### Core Tables

**users**
```sql
id: SERIAL PRIMARY KEY
email: VARCHAR UNIQUE NOT NULL
hashed_password: VARCHAR NOT NULL
full_name: VARCHAR
role: ENUM('user', 'recruiter', 'admin')
is_active: BOOLEAN DEFAULT false
is_verified: BOOLEAN DEFAULT false
public_key: TEXT  -- For PKI
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

**profiles**
```sql
id: SERIAL PRIMARY KEY
user_id: INTEGER FK → users.id
headline: VARCHAR
location: VARCHAR
bio: TEXT
profile_picture_url: VARCHAR
privacy_headline: ENUM('public', 'connections', 'private')
privacy_location: ENUM('public', 'connections', 'private')
-- Similar privacy fields for each attribute
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

**companies**
```sql
id: SERIAL PRIMARY KEY
name: VARCHAR NOT NULL
description: TEXT
location: VARCHAR
website: VARCHAR
is_verified: BOOLEAN DEFAULT false  -- For PKI verification
created_by: INTEGER FK → users.id
created_at: TIMESTAMP
```

**jobs**
```sql
id: SERIAL PRIMARY KEY
company_id: INTEGER FK → companies.id
title: VARCHAR NOT NULL
description: TEXT
required_skills: TEXT[]
location: VARCHAR
remote: BOOLEAN
job_type: ENUM('internship', 'full-time', 'part-time')
salary_min: INTEGER
salary_max: INTEGER
application_deadline: DATE
status: ENUM('open', 'closed')
created_at: TIMESTAMP
```

**applications**
```sql
id: SERIAL PRIMARY KEY
job_id: INTEGER FK → jobs.id
user_id: INTEGER FK → users.id
resume_path: VARCHAR  -- Encrypted file path
cover_note: TEXT
status: ENUM('applied', 'reviewed', 'interviewed', 'rejected', 'offer')
recruiter_notes: TEXT
applied_at: TIMESTAMP
updated_at: TIMESTAMP
```

**connections**
```sql
id: SERIAL PRIMARY KEY
requester_id: INTEGER FK → users.id
receiver_id: INTEGER FK → users.id
status: ENUM('pending', 'accepted', 'rejected')
created_at: TIMESTAMP
```

**messages**
```sql
id: SERIAL PRIMARY KEY
conversation_id: INTEGER FK → conversations.id
sender_id: INTEGER FK → users.id
encrypted_content: TEXT  -- Ciphertext
signature: TEXT  -- PKI signature
iv: VARCHAR  -- Initialization vector
created_at: TIMESTAMP
```

**conversations**
```sql
id: SERIAL PRIMARY KEY
participant_ids: INTEGER[]  -- Array of user IDs
is_group: BOOLEAN
created_at: TIMESTAMP
```

**otp_tokens**
```sql
id: SERIAL PRIMARY KEY
user_id: INTEGER FK → users.id
token: VARCHAR  -- Hashed OTP
purpose: ENUM('registration', 'password_reset', 'resume_download')
expires_at: TIMESTAMP
is_used: BOOLEAN DEFAULT false
created_at: TIMESTAMP
```

**audit_logs**
```sql
id: SERIAL PRIMARY KEY
user_id: INTEGER FK → users.id (nullable for system events)
action: VARCHAR NOT NULL
resource: VARCHAR
metadata: JSONB
ip_address: VARCHAR
prev_hash: VARCHAR
current_hash: VARCHAR NOT NULL
created_at: TIMESTAMP
```

---

## API Endpoint Design

### Authentication Endpoints

**POST /auth/register**
```json
Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}

Response:
{
  "message": "OTP sent to email",
  "user_id": 123
}
```

**POST /auth/verify-otp**
```json
Request:
{
  "user_id": 123,
  "otp": "123456"
}

Response:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

**POST /auth/login**
```json
Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {...}
}
```

### Job Endpoints

**GET /jobs/search?q=python&location=remote&type=full-time**
```json
Response:
{
  "total": 25,
  "jobs": [
    {
      "id": 1,
      "title": "Senior Python Developer",
      "company": "Tech Corp",
      "location": "Remote",
      "salary_range": "$100k-$150k",
      "posted_date": "2026-02-05"
    }
  ]
}
```

**POST /jobs/{job_id}/apply**
```json
Request:
{
  "resume_file": <multipart/form-data>,
  "cover_note": "I am excited to apply..."
}

Response:
{
  "application_id": 456,
  "status": "applied",
  "message": "Application submitted successfully"
}
```

### Message Endpoints

**POST /messages/send**
```json
Request:
{
  "recipient_id": 789,
  "encrypted_content": "U2FsdGVkX1...",
  "signature": "MEUCIQDx...",
  "iv": "a1b2c3d4..."
}

Response:
{
  "message_id": 1001,
  "sent_at": "2026-02-07T12:00:00Z"
}
```

---

## Security Controls Matrix

| Threat | Mitigation |
|--------|-----------|
| SQL Injection | Parameterized queries (SQLAlchemy ORM) |
| XSS | Input sanitization, CSP headers, output encoding |
| CSRF | CSRF tokens, SameSite cookies |
| Session Hijacking | Secure cookies (HttpOnly, Secure), short expiry, IP binding |
| Session Fixation | Regenerate session ID on login |
| Brute Force | Rate limiting (10 attempts/hour), account lockout |
| MITM | TLS 1.2+, HSTS header |
| Data Breach | Encryption at rest, hashed passwords, minimal data retention |
| Unauthorized Access | JWT authentication, RBAC, field-level permissions |
| File Upload Attacks | Type validation, size limits, virus scanning (optional) |
| Replay Attacks | Nonce/timestamp in requests, short-lived tokens |

---

## Deployment Architecture

```
Ubuntu VM
├── /home/ubuntu/projects/FCS/
│   ├── venv/                    # Python virtual environment
│   ├── backend/
│   │   ├── app/                 # FastAPI application
│   │   ├── alembic/             # Database migrations
│   │   ├── .env                 # Environment variables
│   │   └── uploads/             # Encrypted file storage
│   └── frontend/                # React/Vue app
│
├── /etc/nginx/
│   ├── nginx.conf
│   ├── sites-available/job-platform
│   └── ssl/                     # SSL certificates
│
├── /etc/systemd/system/
│   └── job-platform.service     # FastAPI service
│
└── /var/log/
    ├── nginx/
    └── job-platform/
```

---

## Technology Stack Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **OS** | Ubuntu 22.04 LTS | Server platform |
| **Web Server** | Nginx | Reverse proxy, SSL termination |
| **Backend** | FastAPI (Python) | REST API |
| **Database** | PostgreSQL 14+ | Relational data storage |
| **ORM** | SQLAlchemy | Database abstraction |
| **Cache** | Redis | Session storage, rate limiting |
| **Authentication** | JWT + OTP | Token-based auth |
| **Password Hashing** | bcrypt/Argon2 | Secure password storage |
| **Encryption** | Fernet (AES-256) | File encryption |
| **PKI** | cryptography library | Signing, verification |
| **E2EE** | PyNaCl (libsodium) | Client-side encryption |
| **Frontend** | React/Vue | User interface |
| **Task Queue** | Celery (optional) | Background jobs |

---

## Performance Considerations

**Scalability**
- Connection pooling (SQLAlchemy)
- Redis caching for frequent queries
- Async I/O (FastAPI with `asyncio`)
- Database indexing on foreign keys and search fields
- Pagination for large result sets

**Security vs Performance**
- Balance encryption overhead with user experience
- Cache public profile data (not private)
- Lazy-load encrypted data
- Implement CDN for static assets (frontend)

---

## Next Steps

1. Review this architecture
2. Follow [SETUP_GUIDE.md](SETUP_GUIDE.md) for installation
3. Follow [WORKFLOW.md](WORKFLOW.md) for milestone tasks
4. Implement one feature at a time
5. Test security at each step

Good luck building a secure platform! 🔒
