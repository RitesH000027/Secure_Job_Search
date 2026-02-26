# Make models importable from app.models
from app.models.user import User, Profile, OTPToken, UserRole
from app.models.resume import Resume

__all__ = ["User", "Profile", "OTPToken", "UserRole", "Resume"]
