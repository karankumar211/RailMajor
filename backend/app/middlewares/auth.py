"""RailOpt AI - Auth Middleware & Verification Utilities
Exposes JWT authentication and verification helpers for route protection.
"""
from app.auth.security import decode_access_token, hash_password, verify_password, create_access_token
from app.auth.dependencies import get_current_user, get_optional_current_user

__all__ = [
    "decode_access_token",
    "hash_password",
    "verify_password",
    "create_access_token",
    "get_current_user",
    "get_optional_current_user",
]
