# CareerBridge

CareerBridge is a full-stack professional networking and job platform built with FastAPI, React, PostgreSQL, JWT auth, OTP verification, encrypted messaging, and deployment scripts for the current college-server workflow.

## What the app does

- User registration, login, OTP verification, password reset, and optional TOTP support.
- Profile management with privacy controls, profile pictures, and viewer tracking.
- Professional connections with friend requests, graph view, and mutual-connection messaging.
- Secure 1-to-1 and group messaging with client-side encryption support.
- Company pages, job posting, job search, recruiter applicant review, and application tracking.
- Home feed with posts from connections and company/job activity.
- Resume upload, encrypted storage, integrity verification, and OTP-protected actions.
- Admin dashboard, audit logs, tamper-evident log verification, and security hardening.

## Repository Layout

```text
FCS/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   └── utils/
│   └── smoke_march.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── services/
│   ├── package.json
│   └── vite.config.js
├── scripts/
│   ├── deploy_v0_college_server.sh
│   ├── start_backend_server.sh
│   ├── start_frontend.ps1
│   ├── start_tunnel.ps1
│   ├── THREE_TERMINAL_RUNBOOK.md
│   └── V0_DEPLOY_NOW.md
├── requirements.txt
├── .env.example
└── README.md
```

## Tech Stack

- Backend: FastAPI
- Database: PostgreSQL
- ORM: SQLAlchemy
- Auth: JWT + OTP
- Messaging: encrypted conversation keys with ciphertext-only storage for secure messages
- Frontend: React 19 + Vite + Tailwind CSS
- Deployment helpers: shell and PowerShell scripts for the college-server workflow

## Key Features

### Authentication and Security

- JWT login and refresh flow
- Email and mobile OTP verification
- OTP-gated high-risk actions
- Optional TOTP support
- Security headers, trusted host validation, and CORS restrictions

### Profiles and Connections

- Editable professional profiles
- Privacy controls for profile fields
- Profile pictures
- Connection requests and graph view
- Recent profile viewers and view tracking controls

### Messaging

- One-to-one secure messaging
- Group messaging
- Group join requests and admin controls
- Search people from the global header
- Connection-aware messaging flows

### Jobs and Companies

- Create and manage company pages
- Post jobs with salary, location, work mode, and deadline
- Recruiter applicant review and status updates
- Applicant names shown in recruiter views
- Apply-deadline enforcement for candidates

### Feed

- Create posts with optional images
- Edit/delete own posts
- Like and comment on posts
- Home feed shows posts from connections and company/job activity
- Infinite scroll loading for feed items

### Resume and Admin

- Encrypted resume upload and storage
- Resume integrity verification
- OTP-protected download and delete flows
- Admin dashboard, audit log access, and verification endpoint

## Local Development

### Backend

1. Create and activate a Python virtual environment.
2. Install backend dependencies from `requirements.txt`.
3. Configure `.env` from `.env.example`.
4. Run the backend from the `backend/` directory.

Example:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

For a production-style local preview:

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

## College Server Workflow

This repo includes scripts for the current deployment workflow:

- `scripts/start_backend_server.sh`
- `scripts/start_frontend.ps1`
- `scripts/start_tunnel.ps1`
- `scripts/deploy_v0_college_server.sh`
- `scripts/THREE_TERMINAL_RUNBOOK.md`
- `scripts/V0_DEPLOY_NOW.md`

Typical flow:

1. Push local changes to git.
2. Pull the changes on the college server.
3. Restart backend and frontend using the provided scripts.
4. Re-open the tunnel if needed.

## Environment Variables

Create a `.env` file from `.env.example` and configure values like:

- `SECRET_KEY`
- `DATABASE_URL`
- `ENCRYPTION_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `REDIS_URL` if used

The backend auto-creates required tables on startup for the current schema.

## API Docs

When the backend is running, open:

- `/docs` for Swagger UI
- `/redoc` for ReDoc

## Notes

- Uploaded profile pictures are served from `/profile-pictures`.
- Uploaded post images are served from `/post-images`.
- The home feed currently combines connection posts and active company job activity.
- Recruiters can update job deadlines after posting, and candidates cannot apply after the deadline passes.

## License

Educational project for FCS course use.