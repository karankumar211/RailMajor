"""RailOpt AI - Request Logging Middleware
Logs HTTP method, path, response status code, and execution duration per request.
"""
import time
import logging
from fastapi import Request

logger = logging.getLogger("railopt.http")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

async def logging_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    logger.info(
        f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)"
    )
    response.headers["X-Process-Time-Ms"] = str(duration_ms)
    return response
