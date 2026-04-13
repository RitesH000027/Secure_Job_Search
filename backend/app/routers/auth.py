"""
Authentication endpoints for user registration, login, and OTP verification
"""
from datetime import datetime, timedelta
import smtplib
import ssl
import base64
import urllib.parse
import urllib.request
from collections import defaultdict, deque
from email.message import EmailMessage
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi import Request
from sqlalchemy.orm import Session
from threading import Lock
from app.database import get_db
from app.models.user import User, Profile
from app.schemas.user import (
    UserRegister, UserLogin, OTPVerify, OTPResend,
    PasswordReset, PasswordResetConfirm, HighRiskOTPRequest, Token, TokenRefresh,
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
from app.utils.audit import log_audit_event
from app.utils.input_sanitization import sanitize_text


router = APIRouter(prefix="/auth", tags=["Authentication"])
ALLOWED_HIGH_RISK_ACTIONS = {"resume_download", "resume_delete", "account_delete"}
LOGIN_RATE_LIMIT_WINDOW = timedelta(hours=1)
login_attempts_lock = Lock()
login_attempts_by_key: dict[str, deque[datetime]] = defaultdict(deque)


def _get_rate_limit_key(request: Request, email: str) -> str:
    client_host = request.client.host if request.client else "unknown"
    return f"{client_host}:{email.strip().lower()}"


def _prune_login_attempts(attempts: deque[datetime], now: datetime) -> None:
    window_start = now - LOGIN_RATE_LIMIT_WINDOW
    while attempts and attempts[0] < window_start:
        attempts.popleft()


def _check_login_rate_limit(request: Request, email: str) -> None:
    now = datetime.utcnow()
    key = _get_rate_limit_key(request, email)
    with login_attempts_lock:
        attempts = login_attempts_by_key[key]
        _prune_login_attempts(attempts, now)
        if len(attempts) >= settings.LOGIN_RATE_LIMIT_PER_HOUR:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many login attempts. Try again later.",
                headers={"Retry-After": str(int(LOGIN_RATE_LIMIT_WINDOW.total_seconds()))},
            )
        attempts.append(now)


def send_otp_email(email: str, otp: str, purpose: str):
    """
    Send OTP via SMTP email
    
    Args:
        email: Recipient email address
        otp: OTP code to send
        purpose: Purpose of OTP (registration, password_reset, etc.)
    """
    subject = f"Your OTP Code for {purpose.replace('_', ' ').title()}"
    body = (
        f"Your OTP for {purpose.replace('_', ' ')} is: {otp}\n\n"
        f"This OTP is valid for {settings.OTP_EXPIRY_MINUTES} minutes."
    )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
    message["To"] = email
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(message)
    except Exception as exc:
        print(f"[EMAIL][ERROR] Failed to send OTP to {email}: {exc}")


def send_otp_sms(mobile_number: str, otp: str, purpose: str):
    """
    Send OTP via SMS (simulated provider hook)

    Replace this implementation with your SMS provider integration if available.
    """
    message_body = (
        f"Your OTP for {purpose.replace('_', ' ')} is: {otp}. "
        f"Valid for {settings.OTP_EXPIRY_MINUTES} minutes."
    )

    if not (
        settings.TWILIO_ACCOUNT_SID
        and settings.TWILIO_AUTH_TOKEN
        and settings.TWILIO_FROM_NUMBER
    ):
        print(f"[SMS] Sending OTP to {mobile_number}: {otp} (Purpose: {purpose})")
        return

    twilio_url = (
        "https://api.twilio.com/2010-04-01/Accounts/"
        f"{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    )

    payload = urllib.parse.urlencode(
        {
            "To": mobile_number,
            "From": settings.TWILIO_FROM_NUMBER,
            "Body": message_body,
        }
    ).encode()

    request = urllib.request.Request(twilio_url, data=payload, method="POST")
    auth = base64.b64encode(
        f"{settings.TWILIO_ACCOUNT_SID}:{settings.TWILIO_AUTH_TOKEN}".encode()
    ).decode()
    request.add_header("Authorization", f"Basic {auth}")
    request.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(request, timeout=15):
            return
    except Exception as exc:
        print(f"[SMS][ERROR] Failed to send OTP to {mobile_number}: {exc}")


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
    # Check if user/mobile already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    normalized_mobile = user_data.mobile_number.strip() if user_data.mobile_number else None
    existing_mobile = None
    if normalized_mobile:
        existing_mobile = db.query(User).filter(User.mobile_number == normalized_mobile).first()

    full_name = sanitize_text(user_data.full_name, max_length=100)
    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name cannot be empty"
        )

    # Recovery path: allow re-registration for unverified accounts.
    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        if existing_mobile and existing_mobile.id != existing_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mobile number already registered"
            )

        existing_user.full_name = full_name
        existing_user.hashed_password = hash_password(user_data.password)
        existing_user.role = user_data.role
        existing_user.mobile_number = normalized_mobile
        existing_user.is_active = True
        existing_user.is_verified = False
        existing_user.is_mobile_verified = True
        existing_user.is_suspended = False

        profile = db.query(Profile).filter(Profile.user_id == existing_user.id).first()
        if not profile:
            db.add(Profile(user_id=existing_user.id))

        db.commit()
        db.refresh(existing_user)

        shared_otp, _ = create_otp_token(db, existing_user.id, purpose="registration")
        background_tasks.add_task(send_otp_email, existing_user.email, shared_otp, "registration")
        if existing_user.mobile_number:
            background_tasks.add_task(send_otp_sms, existing_user.mobile_number, shared_otp, "registration")

        log_audit_event(
            db,
            action="registration_reinitiated",
            target_type="user",
            actor_user_id=existing_user.id,
            target_id=str(existing_user.id),
            details={"email": existing_user.email, "role": existing_user.role.value},
        )
        db.commit()

        return {
            "message": "Existing unverified account found. A new OTP has been sent to your email.",
            "email": existing_user.email,
        }

    if existing_mobile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number already registered"
        )

    new_user = User(
        email=user_data.email,
        mobile_number=normalized_mobile,
        hashed_password=hash_password(user_data.password),
        full_name=full_name,
        role=user_data.role,
        is_active=True,
        is_verified=False,
        is_mobile_verified=True,
        is_suspended=False
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create empty profile for the user
    profile = Profile(user_id=new_user.id)
    db.add(profile)
    db.commit()
    
    # Generate one OTP and send the same code to both email and mobile
    shared_otp, _ = create_otp_token(db, new_user.id, purpose="registration")
    background_tasks.add_task(send_otp_email, new_user.email, shared_otp, "registration")
    if new_user.mobile_number:
        background_tasks.add_task(send_otp_sms, new_user.mobile_number, shared_otp, "registration")

    log_audit_event(
        db,
        action="user_registered",
        target_type="user",
        actor_user_id=new_user.id,
        target_id=str(new_user.id),
        details={"email": new_user.email, "role": new_user.role.value},
    )
    db.commit()

    return {
        "message": "Registration successful. Please verify using the OTP sent to your email.",
        "email": new_user.email,
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
    
    # Verify shared OTP
    is_valid_otp, otp_error = verify_otp(
        db,
        user.id,
        otp_data.otp,
        purpose="registration"
    )
    
    if not is_valid_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=otp_error
        )
    
    # Activate user account
    user.is_verified = True
    user.is_mobile_verified = True
    log_audit_event(
        db,
        action="registration_otp_verified",
        target_type="user",
        actor_user_id=user.id,
        target_id=str(user.id),
    )
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
    
    # Generate and resend one shared OTP
    shared_otp, _ = create_otp_token(db, user.id, purpose="registration")
    background_tasks.add_task(send_otp_email, user.email, shared_otp, "registration")
    if user.mobile_number:
        background_tasks.add_task(send_otp_sms, user.mobile_number, shared_otp, "registration")
    
    return {"message": "OTP resent successfully. Please check your email."}


@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT tokens
    
    - Validates credentials
    - Returns access and refresh tokens
    """
    _check_login_rate_limit(request, login_data.email)

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
    user.updated_at = datetime.utcnow()
    log_audit_event(
        db,
        action="user_logged_in",
        target_type="user",
        actor_user_id=user.id,
        target_id=str(user.id),
    )
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
    otp, _ = create_otp_token(db, user.id, purpose="password_reset")
    background_tasks.add_task(send_otp_email, user.email, otp, "password_reset")

    log_audit_event(
        db,
        action="password_reset_requested",
        target_type="user",
        actor_user_id=user.id,
        target_id=str(user.id),
    )
    db.commit()

    return {"message": "If the email exists, a password reset OTP has been sent."}


@router.post("/high-risk-otp/request", response_model=dict)
async def request_high_risk_action_otp(
    payload: HighRiskOTPRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    action = payload.action.strip().lower()
    if action not in ALLOWED_HIGH_RISK_ACTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported high-risk action",
        )

    otp, _ = create_otp_token(db, current_user.id, purpose=action)
    background_tasks.add_task(send_otp_email, current_user.email, otp, action)
    if current_user.mobile_number:
        background_tasks.add_task(send_otp_sms, current_user.mobile_number, otp, action)

    log_audit_event(
        db,
        action="high_risk_otp_requested",
        target_type="otp",
        actor_user_id=current_user.id,
        target_id=str(current_user.id),
        details={"action": action},
    )
    db.commit()

    return {
        "message": "OTP sent for high-risk action verification.",
        "action": action,
    }


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
    log_audit_event(
        db,
        action="password_reset_confirmed",
        target_type="user",
        actor_user_id=user.id,
        target_id=str(user.id),
    )
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
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Login with email, password, and TOTP code (for users with 2FA enabled)
    """
    _check_login_rate_limit(request, email)

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
    user.updated_at = datetime.utcnow()
    log_audit_event(
        db,
        action="user_logged_in_totp",
        target_type="user",
        actor_user_id=user.id,
        target_id=str(user.id),
    )
    db.commit()
    
    # Generate tokens
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return Token(access_token=access_token, refresh_token=refresh_token)

