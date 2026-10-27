"""RailOpt AI - Authentication Routes
Endpoints for user registration, controller login, and profile introspection.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.database.models import User
from app.schemas.schemas import UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse
from app.auth.security import hash_password, verify_password, create_access_token
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    body: UserRegisterRequest,
    db: Session = Depends(get_db),
):
    """Registers a new dispatch controller or admin user, returns signed JWT access token."""
    clean_username = body.username.strip()
    if not clean_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username cannot be blank or whitespace."
        )

    # Check if username already exists
    existing = db.query(User).filter(User.username == clean_username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{clean_username}' is already registered."
        )

    # Hash password and create record
    hashed_pw = hash_password(body.password)
    user_id = f"USR_{uuid.uuid4().hex[:8].upper()}"
    new_user = User(
        user_id=user_id,
        username=clean_username,
        hashed_password=hashed_pw,
        role=body.role or "controller",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate JWT
    token_payload = {
        "sub": new_user.username,
        "user_id": new_user.user_id,
        "role": new_user.role,
    }
    access_token = create_access_token(token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            user_id=new_user.user_id,
            username=new_user.username,
            role=new_user.role,
            created_at=new_user.created_at.isoformat() if new_user.created_at else None,
        ),
    )


@router.post("/login", response_model=TokenResponse)
def login_user(
    body: UserLoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticates controller credentials and returns a signed JWT access token."""
    clean_username = body.username.strip()
    user = db.query(User).filter(User.username == clean_username).first()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate JWT
    token_payload = {
        "sub": user.username,
        "user_id": user.user_id,
        "role": user.role,
    }
    access_token = create_access_token(token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            user_id=user.user_id,
            username=user.username,
            role=user.role,
            created_at=user.created_at.isoformat() if user.created_at else None,
        ),
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Returns the authenticated controller's current session profile."""
    return UserResponse(
        user_id=current_user.user_id,
        username=current_user.username,
        role=current_user.role,
        created_at=current_user.created_at.isoformat() if current_user.created_at else None,
    )
