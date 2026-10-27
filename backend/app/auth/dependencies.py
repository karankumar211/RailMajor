"""RailOpt AI - Authentication Dependencies
Provides JWT token verification and user extraction dependencies for protected endpoints.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.database.models import User
from app.auth.security import decode_access_token

# HTTPBearer scheme expects "Authorization: Bearer <token>"
security_bearer = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Validates the JWT access token and resolves the active authenticated User.
    Raises 401 Unauthorized if the token is missing, expired, or invalid.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer authorization token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username: str = payload["sub"]
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authenticated user '{username}' no longer exists in system.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Optionally resolves current user if a valid Bearer token is provided.
    Does not raise an error if unauthenticated (returns None).
    """
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials=credentials, db=db)
    except HTTPException:
        return None
