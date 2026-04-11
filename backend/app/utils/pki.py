"""
PKI helper utilities for signing and verification.
"""
from __future__ import annotations

import os
import base64
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey, RSAPublicKey
from app.config import settings


def _ensure_keypair() -> None:
    private_path = settings.PKI_PRIVATE_KEY_PATH
    public_path = settings.PKI_PUBLIC_KEY_PATH

    if os.path.exists(private_path) and os.path.exists(public_path):
        return

    os.makedirs(os.path.dirname(private_path), exist_ok=True)
    os.makedirs(os.path.dirname(public_path), exist_ok=True)

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()

    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    with open(private_path, "wb") as private_file:
        private_file.write(private_bytes)

    with open(public_path, "wb") as public_file:
        public_file.write(public_bytes)


def _load_private_key():
    _ensure_keypair()
    with open(settings.PKI_PRIVATE_KEY_PATH, "rb") as private_file:
        key = serialization.load_pem_private_key(private_file.read(), password=None)
        if not isinstance(key, RSAPrivateKey):
            raise ValueError("Configured private key is not RSA")
        return key


def _load_public_key():
    _ensure_keypair()
    with open(settings.PKI_PUBLIC_KEY_PATH, "rb") as public_file:
        key = serialization.load_pem_public_key(public_file.read())
        if not isinstance(key, RSAPublicKey):
            raise ValueError("Configured public key is not RSA")
        return key


def sign_bytes(payload: bytes) -> str:
    private_key = _load_private_key()
    signature = private_key.sign(
        payload,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH,
        ),
        hashes.SHA256(),
    )
    return base64.b64encode(signature).decode("utf-8")


def verify_signature(payload: bytes, signature_b64: str) -> bool:
    try:
        signature = base64.b64decode(signature_b64)
        public_key = _load_public_key()
        public_key.verify(
            signature,
            payload,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH,
            ),
            hashes.SHA256(),
        )
        return True
    except Exception:
        return False


def get_public_key_pem() -> str:
    _ensure_keypair()
    with open(settings.PKI_PUBLIC_KEY_PATH, "rb") as public_file:
        return public_file.read().decode("utf-8")
