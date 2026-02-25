"""
Pydantic schemas for user authentication and profile management
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, validator
from app.models.user import UserRole


# ==================== Authentication Schemas ====================

class UserRegister(BaseModel):
    """Schema for user registration"""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=100)
    role: UserRole = UserRole.USER
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength"""
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.islower() for char in v):
            raise ValueError('Password must contain at least one lowercase letter')
        return v


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class OTPVerify(BaseModel):
    """Schema for OTP verification"""
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


class OTPResend(BaseModel):
    """Schema for OTP resend request"""
    email: EmailStr


class PasswordReset(BaseModel):
    """Schema for password reset request"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation"""
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8, max_length=100)
    
    @validator('new_password')
    def validate_password(cls, v):
        """Validate password strength"""
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.islower() for char in v):
            raise ValueError('Password must contain at least one lowercase letter')
        return v


class Token(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    """Schema for token refresh request"""
    refresh_token: str


# ==================== User Response Schemas ====================

class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    full_name: str
    role: UserRole


class UserResponse(UserBase):
    """Schema for user response (without sensitive data)"""
    id: int
    is_active: bool
    is_verified: bool
    is_suspended: bool
    public_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserWithProfile(UserResponse):
    """Schema for user with profile data"""
    profile: Optional['ProfileResponse'] = None
    
    class Config:
        from_attributes = True


# ==================== Profile Schemas ====================

class ProfileBase(BaseModel):
    """Base profile schema"""
    headline: Optional[str] = Field(None, max_length=200)
    location: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=1000)


class ProfileCreate(ProfileBase):
    """Schema for creating a profile"""
    pass


class ProfileUpdate(ProfileBase):
    """Schema for updating a profile"""
    privacy_show_email: Optional[bool] = None
    privacy_show_phone: Optional[bool] = None
    privacy_show_location: Optional[bool] = None
    allow_profile_view_tracking: Optional[bool] = None


class ProfileResponse(ProfileBase):
    """Schema for profile response"""
    id: int
    user_id: int
    profile_picture_url: Optional[str] = None
    privacy_show_email: bool
    privacy_show_phone: bool
    privacy_show_location: bool
    profile_view_count: int
    allow_profile_view_tracking: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Admin Schemas ====================

class UserSuspend(BaseModel):
    """Schema for suspending a user"""
    reason: str = Field(..., min_length=10, max_length=500)


class UserActivate(BaseModel):
    """Schema for activating a user"""
    note: Optional[str] = Field(None, max_length=500)


# Update forward references
UserWithProfile.model_rebuild()
