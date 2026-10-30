import json
from typing import List, Literal, Optional
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from backend.app.agents.copilot_agent import TOOLS, stream_copilot

router = APIRouter(prefix="/copilot", tags=["Copilot Agent"])


class CopilotTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=8000)


class CopilotRequest(BaseModel):
    messages: List[CopilotTurn] = Field(min_length=1, max_length=40)
    job_id: Optional[str] = None


@router.get("/tools")
async def list_copilot_tools():
    """Tools the Copilot agent can call (shown in the UI)."""
    return [{"name": t.name, "description": t.description.split(". ")[0]} for t in TOOLS]


@router.post("/chat")
async def copilot_chat(payload: CopilotRequest):
    """Stream the agent's reasoning steps, tool calls, proposals and final answer as Server-Sent Events."""
    async def events():
        async for event in stream_copilot([t.model_dump() for t in payload.messages], payload.job_id or ""):
            yield f"data: {json.dumps(event, default=str)}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
