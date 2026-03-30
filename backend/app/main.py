"""
Main FastAPI application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from app.config import settings
from app.database import engine, Base
from app import models  # noqa: F401
from app.routers import auth, profile, resume, admin, company, jobs, messaging, connections

app = FastAPI(
    title=settings.APP_NAME,
    description="CareerBridge - Professional Networking and Job Search Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(resume.router)
app.include_router(admin.router)
app.include_router(company.router)
app.include_router(jobs.router)
app.include_router(messaging.router)
app.include_router(connections.router)


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
