"""
Authentication endpoints for user registration, login, and OTP verification
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Profile
from app.schemas.user import (
    UserRegister, UserLogin, OTPVerify, OTPResend,
    PasswordReset, PasswordResetConfirm, Token, TokenRefresh,
    UserResponse, UserWithProfile
)
from app.utils.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, verify_token
)
from app.utils.otp import create_otp_token, verify_otp
from app.utils.totp import generate_totp_secret, get_totp_uri, generate_qr_code, verify_totp
from app.dependencies import get_current_user, get_current_verified_user
from app.config import settings


router = APIRouter(prefix="/auth", tags=["Authentication"])


# TODO: Implement email sending function
def send_otp_email(email: str, otp: str, purpose: str):
    """
    Send OTP via email (placeholder - implement with actual email service)
    
    Args:
        email: Recipient email address
        otp: OTP code to send
        purpose: Purpose of OTP (registration, password_reset, etc.)
    """
    # This is a placeholder. In production, integrate with SMTP or email service
    print(f"[EMAIL] Sending OTP to {email}: {otp} (Purpose: {purpose})")
    # TODO: Implement actual email sending using SMTP settings from config


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Register a new user and send OTP for email verification
    
    - Creates user account (inactive until email verified)
    - Generates and sends OTP to user's email
    - Returns success message
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        is_active=True,
        is_verified=False,
        is_suspended=False
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create empty profile for the user
    profile = Profile(user_id=new_user.id)
    db.add(profile)
    db.commit()
    
    # Generate and send OTP
    otp, otp_token = create_otp_token(db, new_user.id, purpose="registration")
    background_tasks.add_task(send_otp_email, new_user.email, otp, "registration")
    
    return {
        "message": "Registration successful. Please check your email for OTP verification code.",
        "email": new_user.email
    }


@router.post("/verify-otp", response_model=Token)
async def verify_otp_endpoint(
    otp_data: OTPVerify,
    db: Session = Depends(get_db)
):
    """
    Verify OTP and activate user account
    
    - Validates OTP code
    - Activates user account
    - Returns access and refresh tokens
    """
    # Find user
    user = db.query(User).filter(User.email == otp_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Verify OTP
    is_valid, error_message = verify_otp(db, user.id, otp_data.otp, purpose="registration")
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    
    # Activate user account
    user.is_verified = True
    db.commit()
    
    # Generate tokens
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/resend-otp", response_model=dict)
async def resend_otp(
    otp_data: OTPResend,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Resend OTP for email verification
    
    - Generates new OTP
    - Sends OTP to user's email
    """
    # Find user
    user = db.query(User).filter(User.email == otp_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Generate and send new OTP
    otp, otp_token = create_otp_token(db, user.id, purpose="registration")
    background_tasks.add_task(send_otp_email, user.email, otp, "registration")
    
    return {"message": "OTP resent successfully. Please check your email."}


@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT tokens
    
    - Validates credentials
    - Returns access and refresh tokens
    """
    # Find user
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended"
        )
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your email first."
        )
    
    # Update last login
    user.updated_at = db.func.now()
    db.commit()
    
    # Generate tokens
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token
    
    - Validates refresh token
    - Returns new access and refresh tokens
    """
    payload = verify_token(token_data.refresh_token, token_type="refresh")
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Verify user still exists and is active
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active or user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Generate new tokens
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return Token(access_token=access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=UserWithProfile)
async def get_current_user_info(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user's information with profile
    """
    # Load profile relationship
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    
    # Create response with profile
    user_dict = UserResponse.from_orm(current_user).dict()
    user_dict['profile'] = profile
    
    return user_dict


@router.post("/password-reset", response_model=dict)
async def request_password_reset(
    reset_data: PasswordReset,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Request password reset OTP
    
    - Generates OTP for password reset
    - Sends OTP to user's email
    """
    # Find user
    user = db.query(User).filter(User.email == reset_data.email).first()
    
    # Don't reveal if email exists or not (security best practice)
    if not user:
        return {"message": "If the email exists, a password reset OTP has been sent."}
    
    # Generate and send OTP
    otp, otp_token = create_otp_token(db, user.id, purpose="password_reset")
    background_tasks.add_task(send_otp_email, user.email, otp, "password_reset")
    
    return {"message": "If the email exists, a password reset OTP has been sent."}


@router.post("/password-reset/confirm", response_model=dict)
async def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    Confirm password reset with OTP and set new password
    
    - Validates OTP
    - Updates password
    """
    # Find user
    user = db.query(User).filter(User.email == reset_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify OTP
    is_valid, error_message = verify_otp(db, user.id, reset_data.otp, purpose="password_reset")
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    
    # Update password
    user.hashed_password = hash_password(reset_data.new_password)
    db.commit()
    
    return {"message": "Password reset successful. You can now login with your new password."}


# ==================== TOTP (2FA) Endpoints ====================

@router.post("/totp/enable", response_model=dict)
async def enable_totp(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Enable TOTP (Time-based OTP) for 2FA
    
    Returns QR code and secret for Google Authenticator / Authy
    """
    if current_user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP is already enabled"
        )
    
    # Generate new TOTP secret
    secret = generate_totp_secret()
    
    # Save secret to database (but don't enable TOTP yet - requires verification)
    current_user.totp_secret = secret
    db.commit()
    
    # Generate QR code
    totp_uri = get_totp_uri(secret, current_user.email)
    qr_code = generate_qr_code(totp_uri)
    
    return {
        "message": "TOTP secret generated. Scan QR code with authenticator app and verify.",
        "secret": secret,
        "qr_code": qr_code,
        "manual_entry_key": secret
    }


@router.post("/totp/verify", response_model=dict)
async def verify_totp_setup(
    token: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Verify TOTP setup by confirming a code from authenticator app
    
    After successful verification, TOTP will be enabled for the account
    """
    if not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP not initialized. Call /auth/totp/enable first."
        )
    
    if current_user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP is already enabled"
        )
    
    # Verify the TOTP token
    if not verify_totp(current_user.totp_secret, token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP code"
        )
    
    # Enable TOTP
    current_user.totp_enabled = True
    db.commit()
    
    return {
        "message": "TOTP successfully enabled for your account",
        "totp_enabled": True
    }


@router.post("/totp/disable", response_model=dict)
async def disable_totp(
    password: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Disable TOTP (requires password confirmation)
    """
    if not current_user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP is not enabled"
        )
    
    # Verify password
    if not verify_password(password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    # Disable TOTP
    current_user.totp_enabled = False
    current_user.totp_secret = None
    db.commit()
    
    return {
        "message": "TOTP disabled successfully",
        "totp_enabled": False
    }


@router.post("/login-totp", response_model=Token)
async def login_with_totp(
    email: str,
    password: str,
    totp_code: str,
    db: Session = Depends(get_db)
):
    """
    Login with email, password, and TOTP code (for users with 2FA enabled)
    """
    # Find user
    user = db.query(User).filter(User.email == email).first()
    
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended"
        )
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your email first."
        )
    
    # Verify TOTP if enabled
    if user.totp_enabled:
        if not user.totp_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="TOTP configuration error"
            )
        
        if not verify_totp(user.totp_secret, totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid TOTP code"
            )
    
    # Update last login
    user.updated_at = db.func.now()
    db.commit()
    
    # Generate tokens
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return Token(access_token=access_token, refresh_token=refresh_token)

