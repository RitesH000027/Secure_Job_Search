"""
Application Configuration
Loads environment variables and provides settings for the application
"""
import json
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "CareerBridge"
    DEBUG: bool = False
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str
    
    # Email (for OTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@jobplatform.com"
    EMAIL_FROM_NAME: str = "CareerBridge"

    # SMS (for mobile OTP) - Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    
    # File Upload
    UPLOAD_DIR: str = "/home/iiitd/projects/FCS/backend/uploads"
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: str = "pdf,docx"
    
    # Encryption
    ENCRYPTION_KEY: str
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    CORS_ORIGINS: str = "http://192.168.3.40,http://192.168.3.40:4173,https://192.168.3.40,https://192.168.3.40:4173,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175"
    SESSION_COOKIE_SECURE: bool = False
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "Lax"
    
    # OTP
    OTP_EXPIRY_MINUTES: int = 5
    OTP_LENGTH: int = 6
    MAX_OTP_ATTEMPTS: int = 3
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    AUTH_RATE_LIMIT_PER_MINUTE: int = 20
    LOGIN_RATE_LIMIT_PER_HOUR: int = 10
    RATE_LIMIT_USE_REDIS: bool = True
    REDIS_RATE_LIMIT_PREFIX: str = "careerbridge:ratelimit"

    # Request limits
    MAX_REQUEST_SIZE_BYTES: int = 12582912  # 12MB
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "/var/log/job-platform/app.log"

    # PKI
    PKI_PRIVATE_KEY_PATH: str = "/home/iiitd/projects/FCS/backend/keys/app_signing_private.pem"
    PKI_PUBLIC_KEY_PATH: str = "/home/iiitd/projects/FCS/backend/keys/app_signing_public.pem"

    # Host validation
    ALLOWED_HOSTS: str = "localhost,127.0.0.1,192.168.3.40"

    @staticmethod
    def _parse_list(raw_value: str | List[str]) -> List[str]:
        if isinstance(raw_value, list):
            return [item.strip() for item in raw_value if item and item.strip()]

        value = (raw_value or "").strip()
        if not value:
            return []

        if value.startswith("["):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except json.JSONDecodeError:
                pass

        return [item.strip() for item in value.split(",") if item.strip()]

    @property
    def cors_origins_list(self) -> List[str]:
        return self._parse_list(self.CORS_ORIGINS)

    @property
    def allowed_hosts_list(self) -> List[str]:
        return self._parse_list(self.ALLOWED_HOSTS)
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env


# Create global settings instance
settings = Settings()
