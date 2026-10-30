"""
In-process pub/sub for live pipeline progress.

LangGraph nodes publish events keyed by job id; SSE subscribers receive them in real time.
A per-job snapshot lets late subscribers (or page reloads) catch up immediately.
Single-process by design — swap for Redis pub/sub when running multiple API workers.
"""
import asyncio
import time
from typing import Any, AsyncIterator, Dict, List, Optional

TERMINAL = {"completed", "failed"}
HEARTBEAT_S = 15


class ProgressBus:
    def __init__(self):
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}
        self._snapshots: Dict[str, Dict[str, Any]] = {}

    def start(self, job_id: str, total: int):
        self._snapshots[job_id] = {
            "job_id": job_id, "status": "running", "stage": "queued", "stage_label": "Queued",
            "done": 0, "total": total, "events": [], "error": None, "started_at": time.time(),
        }
        self.publish(job_id, {"type": "start", "total": total})

    def is_running(self, job_id: str) -> bool:
        return self._snapshots.get(job_id, {}).get("status") == "running"

    def snapshot(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self._snapshots.get(job_id)

    def publish(self, job_id: str, event: Dict[str, Any]):
        snap = self._snapshots.get(job_id)
        if snap is None:
            return  # Pipeline run outside a tracked context (e.g. tests calling the graph directly).
        event = {**event, "ts": round(time.time() - snap["started_at"], 2)}
        kind = event.get("type")
        if kind == "stage":
            snap["stage"], snap["stage_label"] = event["stage"], event["label"]
        elif kind == "progress":
            snap["done"] = event.get("done", snap["done"])
        elif kind in TERMINAL:
            snap["status"] = kind
            snap["error"] = event.get("error")
        snap["events"] = (snap["events"] + [event])[-200:]
        for q in self._subscribers.get(job_id, []):
            q.put_nowait(event)

    async def subscribe(self, job_id: str) -> AsyncIterator[Dict[str, Any]]:
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.setdefault(job_id, []).append(queue)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), HEARTBEAT_S)
                except asyncio.TimeoutError:
                    # Long LLM stages emit nothing; keep hosting proxies from dropping the idle stream.
                    yield {"type": "heartbeat"}
                    continue
                yield event
                if event.get("type") in TERMINAL:
                    return
        finally:
            self._subscribers[job_id].remove(queue)


progress_bus = ProgressBus()


def emit(job_id: str, type_: str, **payload):
    progress_bus.publish(job_id, {"type": type_, **payload})
