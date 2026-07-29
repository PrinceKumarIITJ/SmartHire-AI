import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from backend.app.db.database import init_db
from backend.app.api.routers import jobs, candidates, audit, reports, emails
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("smarthire.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing SmartHire AI Database schema...")
    await init_db()
    yield
    logger.info("SmartHire AI Backend shutdown complete.")

app = FastAPI(
    title="SmartHire AI — Multi-Agent Recruitment Intelligence API",
    description="Full-stack AI recruitment platform orchestrating 7 specialized agents (LangGraph), Explainable AI (XAI) scoring, Candidate RAG Chat, Bias Audit, and Human-in-the-Loop Email Generation.",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Router Endpoints
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(audit.router)
app.include_router(reports.router)
app.include_router(emails.router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "app": "SmartHire AI — Multi-Agent Recruitment Intelligence Platform",
        "version": "2.0.0",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
