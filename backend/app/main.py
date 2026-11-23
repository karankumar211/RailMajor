"""RailOpt AI - FastAPI Application Entrypoint
Wires all REST API endpoints under /api/v1, native WebSocket at /ws,
CORS configuration, request logging middleware, global exception handling,
and database lifecycle management.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.middlewares.logging_middleware import logging_middleware
from app.middlewares.error_handler import global_exception_handler
from app.sockets.ws_manager import ws_manager

from app.database.db import Base, engine, SessionLocal, get_db
from app.database.models import User
from app.auth.security import hash_password
from app.routes.section_routes import router as section_router
from app.routes.conflict_routes import router as conflict_router
from app.routes.recommendation_routes import router as recommendation_router
from app.routes.scenario_routes import router as scenario_router
from app.routes.audit_routes import router as audit_router
from app.routes.simulation_routes import router as simulation_router
from app.routes.auth_routes import router as auth_router


# -------------------------------------------------------------------------
# Application Lifespan: Database Schema Init & Default Controller Provisioning
# -------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup: verify database connectivity & schema tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed default controller if users table is empty
        existing_user = db.query(User).filter(User.username == "controller").first()
        if not existing_user:
            default_controller = User(
                user_id="USR_CONTROLLER_01",
                username="controller",
                hashed_password=hash_password("control123"),
                role="controller",
            )
            db.add(default_controller)
            db.commit()
    except Exception as e:
        print(f"[WARN] Failed to seed default user: {e}")
    finally:
        db.close()

    yield

    # 2. Shutdown: cleanly close open connections
    print("[INFO] Shutting down RailOpt AI backend services.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="RailOpt AI - Decision-support tool for railway traffic control and dynamic conflict resolution",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# -------------------------------------------------------------------------
# CORS Configuration
# -------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
app.add_middleware(BaseHTTPMiddleware, dispatch=logging_middleware)

# Global unhandled exception handler
app.add_exception_handler(Exception, global_exception_handler)

# -------------------------------------------------------------------------
# API Router Registration under /api/v1
# -------------------------------------------------------------------------
api_prefix = settings.API_V1_STR

app.include_router(auth_router, prefix=api_prefix)
app.include_router(section_router, prefix=api_prefix)
app.include_router(conflict_router, prefix=api_prefix)
app.include_router(recommendation_router, prefix=api_prefix)
app.include_router(scenario_router, prefix=api_prefix)
app.include_router(audit_router, prefix=api_prefix)
app.include_router(simulation_router, prefix=api_prefix)


# -------------------------------------------------------------------------
# Health Check & Root Endpoints
# -------------------------------------------------------------------------
@app.get("/", tags=["System"])
def root_info():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "ONLINE",
        "docs": "/docs",
        "health": "/health",
        "api_v1": settings.API_V1_STR,
    }


@app.get("/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """Health check with real-time database probe."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {e}"

    return {
        "status": "healthy" if "unhealthy" not in db_status else "degraded",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": db_status,
    }


# -------------------------------------------------------------------------
# Native WebSocket Push Layer (/ws)
# Broadcasts: conflict.created, recommendation.ready, decision.recorded
# -------------------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; clients can send heartbeat pings or query state
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
