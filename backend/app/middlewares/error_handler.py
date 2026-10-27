"""RailOpt AI - Global Exception Handler Middleware
Catches unhandled errors and returns standardized JSON error responses.
"""
import logging
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("railopt.error")

async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "status_code": 500,
            "message": "Internal server error",
            "detail": str(exc),
            "path": request.url.path,
        },
    )
