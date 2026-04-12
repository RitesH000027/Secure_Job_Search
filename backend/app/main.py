"""
Main FastAPI application
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from app.config import settings
from app.database import engine, Base
from app import models  # noqa: F401
from app.routers import auth, profile, resume, admin, company, jobs, messaging, connections, search

app = FastAPI(
    title=settings.APP_NAME,
    description="CareerBridge - Professional Networking and Job Search Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http: https:"
        return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)
app.add_middleware(SecurityHeadersMiddleware)

PROFILE_PICTURE_DIR = os.path.join(settings.UPLOAD_DIR, "profile_pictures")
os.makedirs(PROFILE_PICTURE_DIR, exist_ok=True)
app.mount("/profile-pictures", StaticFiles(directory=PROFILE_PICTURE_DIR), name="profile-pictures")

# Include routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(resume.router)
app.include_router(admin.router)
app.include_router(company.router)
app.include_router(jobs.router)
app.include_router(messaging.router)
app.include_router(connections.router)
app.include_router(search.router)


@app.on_event("startup")
async def ensure_schema_updates():
    """Ensure required user columns exist for mobile OTP verification."""
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}

    with engine.begin() as connection:
        if "mobile_number" not in existing_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN mobile_number VARCHAR(20)"))
        if "is_mobile_verified" not in existing_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN is_mobile_verified BOOLEAN DEFAULT FALSE"))

    if "resumes" in inspector.get_table_names():
        resume_columns = {column["name"] for column in inspector.get_columns("resumes")}
        with engine.begin() as connection:
            if "file_hash_sha256" not in resume_columns:
                connection.execute(text("ALTER TABLE resumes ADD COLUMN file_hash_sha256 VARCHAR(64)"))
            if "integrity_signature" not in resume_columns:
                connection.execute(text("ALTER TABLE resumes ADD COLUMN integrity_signature TEXT"))
            if "integrity_algorithm" not in resume_columns:
                connection.execute(text("ALTER TABLE resumes ADD COLUMN integrity_algorithm VARCHAR(50) DEFAULT 'rsa-pss-sha256'"))

    if "profiles" in inspector.get_table_names():
        profile_columns = {column["name"] for column in inspector.get_columns("profiles")}
        with engine.begin() as connection:
            if "education" not in profile_columns:
                connection.execute(text("ALTER TABLE profiles ADD COLUMN education TEXT"))
            if "experience" not in profile_columns:
                connection.execute(text("ALTER TABLE profiles ADD COLUMN experience TEXT"))
            if "skills" not in profile_columns:
                connection.execute(text("ALTER TABLE profiles ADD COLUMN skills TEXT"))
            if "privacy_education" not in profile_columns:
                connection.execute(text("ALTER TABLE profiles ADD COLUMN privacy_education VARCHAR(20) DEFAULT 'public'"))
            if "privacy_experience" not in profile_columns:
                connection.execute(text("ALTER TABLE profiles ADD COLUMN privacy_experience VARCHAR(20) DEFAULT 'public'"))
            if "privacy_skills" not in profile_columns:
                connection.execute(text("ALTER TABLE profiles ADD COLUMN privacy_skills VARCHAR(20) DEFAULT 'public'"))

@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.APP_NAME
    }
