# Secure Job Search & Professional Networking Platform

A secure, full-stack job search and networking platform with end-to-end encryption, PKI-backed trust, and tamper-evident audit logging.

## 📚 Documentation

- **[WORKFLOW.md](WORKFLOW.md)** - Detailed milestone breakdown and timeline
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Step-by-step installation guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and security design

## 🚀 Quick Start

### Prerequisites
- Ubuntu 22.04 VM
- Python 3.10+
- PostgreSQL 14+
- Nginx

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd FCS

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start application
uvicorn app.main:app --reload
```

Visit: `https://localhost:8000/docs` for API documentation

## ✨ Features

### Security First
- 🔐 **End-to-End Encryption** for messaging
- 🔑 **PKI Integration** for message signing and resume verification
- 🛡️ **OTP with Virtual Keyboard** for high-risk actions
- 📝 **Tamper-Evident Audit Logs** with hash chaining
- 🔒 **Encrypted Resume Storage** with strict access control
- 🚫 **Multi-Layer Protection** against SQL injection, XSS, CSRF, session hijacking

### Core Functionality
- 👤 User profiles with granular privacy controls
- 🏢 Company pages and job postings
- 🔍 Advanced job search with filters
- 📄 Resume upload and management
- 💬 Secure messaging (1-to-1 and group)
- 🤝 Professional connections
- 📊 Application tracking system
- 👨‍💼 Recruiter dashboard
- 🔧 Admin moderation tools

## 🏗️ Project Structure

```
FCS/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Configuration
│   │   ├── database.py          # Database connection
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # API endpoints
│   │   ├── services/            # Business logic
│   │   ├── utils/               # Utilities (security, OTP, PKI)
│   │   └── middleware/          # Auth, logging, CORS
│   ├── alembic/                 # Database migrations
│   └── tests/                   # Unit and integration tests
├── frontend/                    # React/Vue application
├── requirements.txt             # Python dependencies
├── requirements-dev.txt         # Development tools
└── .env                         # Environment variables
```

## 🔧 Technology Stack

- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Web Server**: Nginx
- **Authentication**: JWT + OTP
- **Encryption**: Fernet (AES-256), PyNaCl
- **Password Hashing**: bcrypt / Argon2
- **Frontend**: React / Vue (TBD)
- **Cache**: Redis

## 📅 Milestones

| Milestone | Date | Status | Deliverables |
|-----------|------|--------|--------------|
| **M1: Setup** | Feb 13 | 🔄 | HTTPS, skeleton app, database |
| **M2: Auth & Profiles** | Feb 27 | ⏳ | Registration, OTP, resume upload, admin dashboard |
| **M3: Jobs & Messaging** | Mar 31 | ⏳ | Job postings, search, E2EE messaging, audit logs |
| **M4: Final** | Apr 30 | ⏳ | PKI, virtual keyboard, security hardening, demo |

## 🛡️ Security Features

### Implemented
- [x] HTTPS with TLS 1.2+
- [x] Password hashing (bcrypt)
- [x] JWT authentication
- [x] OTP verification
- [x] Parameterized queries (SQLAlchemy)

### In Progress
- [ ] Resume encryption at rest
- [ ] E2EE messaging
- [ ] PKI message signing
- [ ] Virtual keyboard for OTP
- [ ] Hash-chained audit logs
- [ ] CSRF protection
- [ ] Rate limiting

## 📖 API Documentation

Once running, visit `/docs` for interactive API documentation (Swagger UI).

### Example Endpoints

```
POST   /auth/register          # User registration
POST   /auth/login             # User login
POST   /auth/verify-otp        # OTP verification
GET    /users/me               # Get current user profile
PUT    /users/me               # Update profile
POST   /resumes/upload         # Upload encrypted resume
GET    /jobs/search            # Search jobs
POST   /jobs/{id}/apply        # Apply to job
POST   /messages/send          # Send encrypted message
GET    /admin/users            # Admin: List all users
GET    /admin/audit-logs       # Admin: View audit logs
```

## 🧪 Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app tests/

# Linting
black app/
ruff check app/
mypy app/
```

## 🚀 Deployment

### Development
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production
```bash
# Using systemd service
sudo systemctl start job-platform
sudo systemctl enable job-platform

# Or with Gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 📝 Environment Variables

```bash
# Application
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost/db
ENCRYPTION_KEY=your-fernet-key

# Email (OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-password

# Optional
REDIS_URL=redis://localhost:6379
```

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open pull request

## 📄 License

Educational project for FCS course.

## 👥 Team

[Your Team Name]

## 📞 Support

For questions or issues, contact [your-email@example.com]

---

**Built with security in mind. 🔒**
