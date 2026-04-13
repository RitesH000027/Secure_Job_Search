"""
Main FastAPI application
"""
import os
import time
from collections import defaultdict, deque
from threading import Lock
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from app.config import settings
from app.database import engine, Base
from app import models  # noqa: F401
from app.routers import auth, profile, resume, admin, company, jobs, messaging, connections, search, feed

try:
    import redis.asyncio as redis
except Exception:  # pragma: no cover
    redis = None

app = FastAPI(
    title=settings.APP_NAME,
    description="CareerBridge - Professional Networking and Job Search Platform",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None
)


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > settings.MAX_REQUEST_SIZE_BYTES:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request payload too large"},
                    )
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid Content-Length header"},
                )

        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._requests_by_key: dict[str, deque[float]] = defaultdict(deque)
        self._window_seconds = 60.0
        self._lock = Lock()

    def _client_ip(self, request) -> str:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        if request.client and request.client.host:
            return request.client.host
        return "unknown"

    def _route_limit(self, path: str) -> int:
        if path.startswith("/auth/"):
            return settings.AUTH_RATE_LIMIT_PER_MINUTE
        return settings.RATE_LIMIT_PER_MINUTE

    def _redis_key(self, ip: str, path: str) -> str:
        safe_path = path.strip("/").replace("/", ":") or "root"
        return f"{settings.REDIS_RATE_LIMIT_PREFIX}:{ip}:{safe_path}"

    async def _enforce_redis_limit(self, request, ip: str, path: str, limit: int):
        redis_client = getattr(request.app.state, "rate_limit_redis", None)
        if redis_client is None:
            return None

        now = time.time()
        key = self._redis_key(ip, path)
        window_start = now - self._window_seconds

        try:
            pipeline = redis_client.pipeline()
            pipeline.zremrangebyscore(key, "-inf", window_start)
            pipeline.zcard(key)
            _, current_count = await pipeline.execute()

            if current_count >= limit:
                oldest = await redis_client.zrange(key, 0, 0, withscores=True)
                if oldest:
                    retry_after = int(self._window_seconds - (now - float(oldest[0][1])))
                else:
                    retry_after = int(self._window_seconds)
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down."},
                    headers={"Retry-After": str(max(retry_after, 1))},
                )

            member = f"{now}:{time.time_ns()}"
            pipeline = redis_client.pipeline()
            pipeline.zadd(key, {member: now})
            pipeline.expire(key, int(self._window_seconds) + 5)
            await pipeline.execute()
            return False
        except Exception:
            return None

    async def dispatch(self, request, call_next):
        path = request.url.path
        if path in {"/health", "/"}:
            return await call_next(request)

        ip = self._client_ip(request)
        limit = self._route_limit(path)

        redis_response = await self._enforce_redis_limit(request, ip, path, limit)
        if isinstance(redis_response, JSONResponse):
            return redis_response
        if redis_response is False:
            return await call_next(request)

        now = time.monotonic()
        key = f"{ip}:{path}"

        with self._lock:
            attempts = self._requests_by_key[key]
            window_start = now - self._window_seconds
            while attempts and attempts[0] < window_start:
                attempts.popleft()

            if len(attempts) >= limit:
                retry_after = int(self._window_seconds - (now - attempts[0])) if attempts else 60
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down."},
                    headers={"Retry-After": str(max(retry_after, 1))},
                )

            attempts.append(now)

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Server"] = "CareerBridge"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'"
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        if request.url.path.startswith("/auth/"):
            response.headers["Cache-Control"] = "no-store"
        return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts_list)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

PROFILE_PICTURE_DIR = os.path.join(settings.UPLOAD_DIR, "profile_pictures")
os.makedirs(PROFILE_PICTURE_DIR, exist_ok=True)
app.mount("/profile-pictures", StaticFiles(directory=PROFILE_PICTURE_DIR), name="profile-pictures")

POST_IMAGE_DIR = os.path.join(settings.UPLOAD_DIR, "post_images")
os.makedirs(POST_IMAGE_DIR, exist_ok=True)
app.mount("/post-images", StaticFiles(directory=POST_IMAGE_DIR), name="post-images")

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
app.include_router(feed.router)


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

    app.state.rate_limit_redis = None
    if settings.RATE_LIMIT_USE_REDIS and redis is not None:
        try:
            redis_client = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
            await redis_client.ping()
            app.state.rate_limit_redis = redis_client
        except Exception:
            app.state.rate_limit_redis = None


@app.on_event("shutdown")
async def shutdown_cleanup():
    redis_client = getattr(app.state, "rate_limit_redis", None)
    if redis_client is None:
        return

    close_method = getattr(redis_client, "aclose", None)
    if close_method is not None:
        await close_method()
    else:
        await redis_client.close()

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
