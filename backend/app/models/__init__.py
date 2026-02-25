# Make models importable from app.models
from app.models.user import User, Profile, OTPToken, UserRole

__all__ = ["User", "Profile", "OTPToken", "UserRole"]
