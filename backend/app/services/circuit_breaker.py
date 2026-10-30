"""
Per-provider circuit breaker for LLM calls.

After FAILURE_THRESHOLD consecutive failures a provider is "open" (skipped) for a cooldown,
so requests go straight to the healthy fallback instead of paying for doomed retries.
Quota/billing errors (429 RESOURCE_EXHAUSTED) open the circuit for longer.
"""
import os
import threading
import time
from typing import Dict, List
import logging

logger = logging.getLogger("smarthire.circuit_breaker")

FAILURE_THRESHOLD = int(os.getenv("LLM_BREAKER_THRESHOLD", "3"))
COOLDOWN_S = float(os.getenv("LLM_BREAKER_COOLDOWN_SECONDS", "60"))
QUOTA_COOLDOWN_S = float(os.getenv("LLM_BREAKER_QUOTA_COOLDOWN_SECONDS", "600"))

_lock = threading.Lock()
_state: Dict[str, Dict] = {}


def _entry(provider: str) -> Dict:
    return _state.setdefault(provider, {"failures": 0, "open_until": 0.0, "last_error": "", "trips": 0})


def record_success(provider: str):
    with _lock:
        e = _entry(provider)
        if e["open_until"]:
            logger.info(f"Circuit for '{provider}' closed after a successful call.")
        e["failures"], e["open_until"] = 0, 0.0


def record_failure(provider: str, error: str):
    with _lock:
        e = _entry(provider)
        e["failures"] += 1
        e["last_error"] = error[:200]
        quota = any(k in error for k in ("RESOURCE_EXHAUSTED", "exceeded your current quota", "insufficient_quota"))
        if quota or e["failures"] >= FAILURE_THRESHOLD:
            cooldown = QUOTA_COOLDOWN_S if quota else COOLDOWN_S
            if time.time() >= e["open_until"]:
                e["trips"] += 1
                reason = "quota exhausted" if quota else f"{e['failures']} consecutive failures"
                logger.warning(f"Circuit OPEN for '{provider}' for {cooldown:.0f}s ({reason}).")
            e["open_until"] = time.time() + cooldown


def is_available(provider: str) -> bool:
    with _lock:
        return time.time() >= _entry(provider)["open_until"]


def order_by_health(providers: List[str]) -> List[str]:
    """Healthy providers first (keeping configured priority); tripped ones last as a final resort."""
    healthy = [p for p in providers if is_available(p)]
    return healthy + [p for p in providers if p not in healthy]


def snapshot() -> Dict[str, Dict]:
    now = time.time()
    with _lock:
        return {
            p: {
                "state": "open" if now < e["open_until"] else "closed",
                "retry_in_s": max(0, round(e["open_until"] - now)),
                "consecutive_failures": e["failures"],
                "trips": e["trips"],
                "last_error": e["last_error"],
            }
            for p, e in _state.items()
        }
