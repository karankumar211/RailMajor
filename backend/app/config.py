"""RailOpt AI - Application Configuration"""
import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "RailOpt AI"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./railopt.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "railopt-ai-secret-control-room-ops-key-sih-2026-secure-32bytes")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

settings = Settings()
