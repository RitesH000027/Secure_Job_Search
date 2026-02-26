"""
File encryption and decryption utilities using Fernet
"""
import os
from cryptography.fernet import Fernet
from app.config import settings


def get_fernet_cipher():
    """Get Fernet cipher instance from encryption key"""
    return Fernet(settings.ENCRYPTION_KEY.encode())


def encrypt_file(file_content: bytes) -> bytes:
    """
    Encrypt file content using Fernet symmetric encryption
    
    Args:
        file_content: Raw file bytes
        
    Returns:
        Encrypted file bytes
    """
    cipher = get_fernet_cipher()
    return cipher.encrypt(file_content)


def decrypt_file(encrypted_content: bytes) -> bytes:
    """
    Decrypt file content using Fernet
    
    Args:
        encrypted_content: Encrypted file bytes
        
    Returns:
        Decrypted file bytes
    """
    cipher = get_fernet_cipher()
    return cipher.decrypt(encrypted_content)


def generate_unique_filename(original_filename: str, user_id: int) -> str:
    """
    Generate a unique filename for storage
    
    Args:
        original_filename: Original uploaded filename
        user_id: ID of the user uploading the file
        
    Returns:
        Unique filename
    """
    import secrets
    import time
    
    # Get file extension
    ext = os.path.splitext(original_filename)[1]
    
    # Generate unique name: user_id + timestamp + random
    timestamp = int(time.time())
    random_str = secrets.token_hex(8)
    
    return f"{user_id}_{timestamp}_{random_str}{ext}.enc"
