import time
import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

from backend.app.core.config import get_settings
from backend.app.services import circuit_breaker
from backend.app.db.database import init_db, engine
from backend.app.api.routers import jobs, candidates, audit, reports, emails, matches, analytics, copilot, ops

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("smarthire.main")
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing SmartHire AI Database schema...")
    await init_db()
    if not settings.llm_providers:
        logger.warning("No LLM provider configured. Set GOOGLE_API_KEY and/or GROQ_API_KEY.")
    yield
    logger.info("SmartHire AI Backend shutdown complete.")

app = FastAPI(
    title="SmartHire AI — Multi-Agent Recruitment Intelligence API",
    description="Full-stack AI recruitment platform orchestrating specialized agents (LangGraph), Explainable AI (XAI) scoring, Candidate RAG Chat, Bias Audit, Interview Kits, and Human-in-the-Loop Email Generation.",
    version=settings.version,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    # Browsers reject credentialed requests to a wildcard origin.
    allow_credentials="*" not in settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Request-ID"],
)

@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-ms"] = f"{elapsed_ms:.0f}"
    if request.url.path.startswith("/api"):
        logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({elapsed_ms:.0f} ms) [{request_id}]")
    return response

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "An unexpected server error occurred."})

ROUTERS = [
    jobs.router, candidates.router, matches.router, audit.router, reports.router, emails.router,
    analytics.router, copilot.router, ops.router,
]

# Versioned API, plus the unversioned /api prefix kept for older clients.
for r in ROUTERS:
    app.include_router(r, prefix="/api/v1")
for r in ROUTERS:
    app.include_router(r, prefix="/api", include_in_schema=False)

@app.get("/api/v1/health", tags=["System"])
async def health():
    db_ok = True
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "version": settings.version,
        "environment": settings.environment,
        "database": "ok" if db_ok else "unreachable",
        "llm_providers": settings.llm_providers,
        "llm_circuit": circuit_breaker.snapshot(),
        "smtp_configured": settings.smtp_configured,
        "shortlist_threshold": settings.shortlist_threshold,
        "max_upload_mb": settings.max_upload_mb,
    }

@app.get("/")
async def root():
    return {
        "status": "online",
        "app": "SmartHire AI — Multi-Agent Recruitment Intelligence Platform",
        "version": settings.version,
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
