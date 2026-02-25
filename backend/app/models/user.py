"""
Database models for user authentication and management
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum


class UserRole(str, enum.Enum):
    """User role enumeration"""
    USER = "user"
    RECRUITER = "recruiter"
    ADMIN = "admin"


class User(Base):
    """
    User model for authentication and basic user data
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=False)  # Activated after OTP verification
    is_verified = Column(Boolean, default=False)
    is_suspended = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Public key for PKI (will be used in later milestones)
    public_key = Column(Text, nullable=True)
    
    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    otp_tokens = relationship("OTPToken", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"


class Profile(Base):
    """
    User profile with professional information and privacy controls
    """
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    
    # Professional information
    headline = Column(String(255))
    location = Column(String(255))
    bio = Column(Text)
    profile_picture_url = Column(String(500))
    
    # Privacy settings (public, connections, private)
    privacy_headline = Column(String(20), default="public")
    privacy_location = Column(String(20), default="public")
    privacy_bio = Column(String(20), default="public")
    privacy_profile_picture = Column(String(20), default="public")
    
    # Profile viewing stats
    profile_view_count = Column(Integer, default=0)
    allow_profile_view_tracking = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship back to user
    user = relationship("User", back_populates="profile")

    def __repr__(self):
        return f"<Profile user_id={self.user_id}>"


class OTPToken(Base):
    """
    OTP tokens for email verification and high-risk actions
    """
    __tablename__ = "otp_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False)  # Hashed OTP
    purpose = Column(String(50), nullable=False)  # registration, password_reset, resume_download, etc.
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)  # Track failed attempts
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship back to user
    user = relationship("User", back_populates="otp_tokens")

    def __repr__(self):
        return f"<OTPToken user_id={self.user_id} purpose={self.purpose}>"
