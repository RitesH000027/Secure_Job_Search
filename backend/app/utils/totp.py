"""
TOTP (Time-based One-Time Password) utilities for 2FA
"""
import pyotp
import qrcode
import io
import base64
from typing import Tuple


def generate_totp_secret() -> str:
    """
    Generate a new TOTP secret (base32 encoded)
    
    Returns:
        Base32 encoded TOTP secret
    """
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str, issuer: str = "Secure Job Platform") -> str:
    """
    Generate TOTP provisioning URI for QR code
    
    Args:
        secret: TOTP secret (base32)
        email: User's email
        issuer: Application name
        
    Returns:
        TOTP URI string
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


def generate_qr_code(data: str) -> str:
    """
    Generate QR code image as base64 string
    
    Args:
        data: Data to encode in QR code (usually TOTP URI)
        
    Returns:
        Base64 encoded PNG image
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode()
    
    return f"data:image/png;base64,{img_base64}"


def verify_totp(secret: str, token: str) -> bool:
    """
    Verify a TOTP token
    
    Args:
        secret: TOTP secret (base32)
        token: 6-digit TOTP code from authenticator app
        
    Returns:
        True if token is valid, False otherwise
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=1)  # Allow 30s time drift


def get_current_totp(secret: str) -> str:
    """
    Get current TOTP code (for testing/debugging)
    
    Args:
        secret: TOTP secret (base32)
        
    Returns:
        Current 6-digit TOTP code
    """
    totp = pyotp.TOTP(secret)
    return totp.now()
