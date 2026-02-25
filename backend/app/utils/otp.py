"""
OTP (One-Time Password) generation and verification utilities
"""
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import OTPToken
from app.config import settings


def generate_otp(length: int = 6) -> str:
    """
    Generate a random numeric OTP
    
    Args:
        length: Length of OTP (default 6)
        
    Returns:
        Random numeric OTP
    """
    return ''.join([str(secrets.randbelow(10)) for _ in range(length)])


def hash_otp(otp: str) -> str:
    """
    Hash an OTP using SHA-256
    
    Args:
        otp: Plain OTP
        
    Returns:
        Hashed OTP
    """
    return hashlib.sha256(otp.encode()).hexdigest()


def create_otp_token(
    db: Session,
    user_id: int,
    purpose: str,
    validity_minutes: int = 10
) -> tuple[str, OTPToken]:
    """
    Create and store an OTP token for a user
    
    Args:
        db: Database session
        user_id: User ID
        purpose: Purpose of OTP (e.g., 'registration', 'password_reset')
        validity_minutes: How long the OTP is valid (default 10 minutes)
        
    Returns:
        Tuple of (plain_otp, OTPToken object)
    """
    # Invalidate any existing unused OTP tokens for this user and purpose
    existing_tokens = db.query(OTPToken).filter(
        OTPToken.user_id == user_id,
        OTPToken.purpose == purpose,
        OTPToken.is_used == False,
        OTPToken.expires_at > datetime.utcnow()
    ).all()
    
    for token in existing_tokens:
        token.is_used = True
    
    # Generate new OTP
    plain_otp = generate_otp()
    hashed_otp = hash_otp(plain_otp)
    
    # Create OTP token record
    otp_token = OTPToken(
        user_id=user_id,
        token_hash=hashed_otp,
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=validity_minutes),
        is_used=False,
        attempts=0
    )
    
    db.add(otp_token)
    db.commit()
    db.refresh(otp_token)
    
    return plain_otp, otp_token


def verify_otp(
    db: Session,
    user_id: int,
    plain_otp: str,
    purpose: str,
    max_attempts: int = 3
) -> tuple[bool, Optional[str]]:
    """
    Verify an OTP token
    
    Args:
        db: Database session
        user_id: User ID
        plain_otp: Plain OTP to verify
        purpose: Purpose of OTP
        max_attempts: Maximum number of verification attempts
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Find the most recent unused OTP token for this user and purpose
    otp_token = db.query(OTPToken).filter(
        OTPToken.user_id == user_id,
        OTPToken.purpose == purpose,
        OTPToken.is_used == False
    ).order_by(OTPToken.created_at.desc()).first()
    
    if not otp_token:
        return False, "No valid OTP found"
    
    # Check if expired
    if otp_token.expires_at < datetime.utcnow():
        return False, "OTP has expired"
    
    # Check if max attempts exceeded
    if otp_token.attempts >= max_attempts:
        otp_token.is_used = True
        db.commit()
        return False, "Maximum verification attempts exceeded"
    
    # Increment attempts
    otp_token.attempts += 1
    
    # Verify OTP
    hashed_input = hash_otp(plain_otp)
    if hashed_input == otp_token.token_hash:
        otp_token.is_used = True
        db.commit()
        return True, None
    else:
        db.commit()
        remaining = max_attempts - otp_token.attempts
        return False, f"Invalid OTP. {remaining} attempts remaining"


def cleanup_expired_otps(db: Session) -> int:
    """
    Clean up expired OTP tokens from the database
    
    Args:
        db: Database session
        
    Returns:
        Number of deleted tokens
    """
    deleted = db.query(OTPToken).filter(
        OTPToken.expires_at < datetime.utcnow()
    ).delete(synchronize_session=False)
    
    db.commit()
    return deleted
