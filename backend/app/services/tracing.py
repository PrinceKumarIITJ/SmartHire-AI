"""
LLM observability: every chat-model call is recorded with its agent, provider, model,
latency, token usage and outcome. Failed primary calls followed by a successful
fallback show up as an error + an ok trace, which is how fallback rate is measured.
"""
import contextvars
import functools
import time
import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID
import logging

from langchain_core.callbacks import BaseCallbackHandler
from sqlalchemy import create_engine, insert

from backend.app.db.database import DATABASE_URL
from backend.app.db.models import LlmTrace
from backend.app.services import circuit_breaker as breaker

logger = logging.getLogger("smarthire.tracing")

current_agent: contextvars.ContextVar[str] = contextvars.ContextVar("current_agent", default="unknown")
current_job: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_job", default=None)

# Callbacks fire from both the event loop and worker threads, so writes use a small sync engine.
_sync_url = DATABASE_URL.replace("+aiosqlite", "").replace("+asyncpg", "+psycopg2")
_engine = create_engine(
    _sync_url,
    connect_args={"check_same_thread": False, "timeout": 5} if _sync_url.startswith("sqlite") else {},
    pool_pre_ping=True,
)


def traced_agent(name: str):
    """Decorator: tag every LLM call made inside an async agent function with the agent name."""
    def decorator(fn):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            token = current_agent.set(name)
            try:
                return await fn(*args, **kwargs)
            finally:
                current_agent.reset(token)
        return wrapper
    return decorator


def _provider(serialized: Dict[str, Any]) -> str:
    ident = " ".join(serialized.get("id", []) or [str(serialized.get("name", ""))]).lower()
    if "google" in ident or "gemini" in ident:
        return "gemini"
    if "groq" in ident:
        return "groq"
    return ident.rsplit(" ", 1)[-1] or "unknown"


class TraceCallback(BaseCallbackHandler):
    """Records one LlmTrace row per chat-model call. Never raises into the caller."""

    def __init__(self):
        self._runs: Dict[UUID, Dict[str, Any]] = {}

    def on_chat_model_start(self, serialized, messages, *, run_id, invocation_params=None, metadata=None, **kwargs):
        params = invocation_params or {}
        ser_kwargs = (serialized or {}).get("kwargs") or {}
        model = (params.get("model") or params.get("model_name") or (metadata or {}).get("ls_model_name")
                 or ser_kwargs.get("model") or ser_kwargs.get("model_name") or "")
        self._runs[run_id] = {
            "start": time.perf_counter(),
            "provider": _provider(serialized or {}),
            "model": str(model).replace("models/", ""),
            "agent": current_agent.get(),
            "job_id": current_job.get(),
        }

    def on_llm_end(self, response, *, run_id, **kwargs):
        usage = {}
        try:
            msg = response.generations[0][0].message
            usage = getattr(msg, "usage_metadata", None) or {}
        except Exception:
            pass
        if not usage and response.llm_output:
            tu = response.llm_output.get("token_usage") or response.llm_output.get("usage") or {}
            usage = {"input_tokens": tu.get("prompt_tokens", 0), "output_tokens": tu.get("completion_tokens", 0)}
        self._record(run_id, "ok", usage=usage)

    def on_llm_error(self, error, *, run_id, **kwargs):
        self._record(run_id, "error", error=str(error)[:500])

    def _record(self, run_id: UUID, status: str, usage: Optional[dict] = None, error: str = ""):
        run = self._runs.pop(run_id, None)
        if not run:
            return
        usage = usage or {}
        if status == "ok":
            breaker.record_success(run["provider"])
        else:
            breaker.record_failure(run["provider"], error)
        row = {
            "id": str(uuid.uuid4()),
            "agent": run["agent"],
            "job_id": run["job_id"],
            "provider": run["provider"],
            "model": run["model"],
            "status": status,
            "latency_ms": int((time.perf_counter() - run["start"]) * 1000),
            "input_tokens": int(usage.get("input_tokens") or 0),
            "output_tokens": int(usage.get("output_tokens") or 0),
            "error": error,
            "created_at": datetime.utcnow(),
        }
        try:
            with _engine.begin() as conn:
                conn.execute(insert(LlmTrace), row)
        except Exception as e:  # observability must never break a request
            logger.debug(f"Could not persist LLM trace: {e}")


trace_callback = TraceCallback()
