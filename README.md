# SmartHire AI — Multi-Agent Recruitment Intelligence Platform

**SmartHire AI** is a production-grade full-stack AI recruitment platform that orchestrates **7 specialized AI agents** using **LangGraph**, **Gemini 2.5 Flash**, **FastAPI**, **Next.js 14**, **SQLite**, and **FAISS** to deliver structured resume parsing, Explainable AI (XAI) candidate ranking, demographic-blind bias auditing, RAG candidate resume chat, and human-in-the-loop candidate email drafting.

---

## 🌟 Key Features

1. **Explicit 7-Agent Orchestration (LangGraph)**:
   - **JD Agent**: Structured Job Description extraction using Pydantic schemas.
   - **Resume Agent**: Automated structured profile parsing from PDF/DOCX resumes.
   - **Matching Agent**: Hybrid semantic + rule-based scoring producing **Explainable AI (XAI)** sub-scores, skill match matrices, and reasoning text.
   - **Bias Audit Agent**: Demographic-blind re-scoring & 80% rule (4/5ths) Disparate Impact audit.
   - **Executive Report Agent**: Synthesizes candidate batch metrics into an AI Executive Hiring Report.
   - **Email Draft Agent**: Generates skills-grounded selection/rejection email drafts with recruiter review & approval before sending.
   - **Candidate Chat Agent**: RAG search over FAISS resume chunks with chunk citations.

2. **Hardened LLM Infrastructure**:
   - Powered by **Gemini 2.5 Flash** with automatic fallback to **Groq (`llama-3.3-70b-versatile`)**.
   - Structured JSON output parsing (`.with_structured_output()`) and exponential backoff retries for 429 rate limit errors.

3. **Modern Decoupled Full-Stack Architecture**:
   - **Backend**: FastAPI RESTful API with async SQLAlchemy SQLite ORM & FAISS vector storage.
   - **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS with dark mode, glassmorphism aesthetics, radar charts, and interactive modals.

---

## 🏗️ System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │       Next.js 14 Frontend UI             │
                               │  Jobs | Upload | Leaderboard | Chat |   │
                               │  Bias Audit | Executive Report | Emails │
                               └────────────────────┬────────────────────┘
                                                    │ REST API
                               ┌────────────────────▼────────────────────┐
                               │           FastAPI Backend               │
                               └────────────────────┬────────────────────┘
                                                    │
             ┌──────────────────────────────────────┼──────────────────────────────────────┐
             │                                      │                                      │
┌────────────▼─────────────┐             ┌──────────▼──────────┐              ┌────────────▼─────────────┐
│  LangGraph Agent Router  │             │   SQLite Database   │              │  FAISS Vector Index      │
│  (Multi-Agent Pipeline)  │             │   Jobs, Candidates, │              │  (Resume Chunks &        │
└────────────┬─────────────┘             │   Matches, Reports, │              │   Embeddings)            │
             │                           │   Drafts, Chat Logs │              └──────────────────────────┘
             ├──────────────────────────────────────┴──────────────────────────────────────┐
             │                                                                             │
 ┌───────────┴───────────┐ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────┴──────────────┐
 │ 1. JD Agent           │ │ 2. Resume Agent      │ │ 3. Matching Agent    │ │ 4. Bias Audit Agent          │
 │ Structured JD extract │ │ Structured candidate │ │ Semantic + hybrid    │ │ Demographic-blind transform  │
 │ (Gemini 2.5 Flash)    │ │ profile parsing      │ │ scoring + XAI output │ │ + disparate impact metrics   │
 └───────────────────────┘ └──────────────────────┘ └──────────────────────┘ └──────────────────────────────┘
 ┌───────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
 │ 5. Executive Report   │ │ 6. Email Draft Agent │ │ 7. Candidate Chat    │
 │ Summarizes candidate  │ │ Skills-grounded,     │ │ RAG over FAISS       │
 │ batch for HR leads    │ │ human-in-loop drafts │ │ chunks + citations   │
 └───────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+
- Gemini API Key (`GOOGLE_API_KEY`) or Groq API Key (`GROQ_API_KEY`)

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file inside `backend/` or root:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
LLM_PROVIDER=gemini
LLM_MODEL_NAME=gemini-2.5-flash
```

Run the backend API server:
```bash
uvicorn backend.app.main:app --reload --port 8000
```
- Interactive Swagger API Documentation: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:3000`

---

## 🧪 Running Unit Tests
```bash
python -m pytest backend/tests/
```

---

## 📂 Project Structure
```
SmartHire/
├── backend/
│   ├── app/
│   │   ├── agents/            # LangGraph multi-agent pipeline nodes
│   │   ├── api/routers/       # FastAPI REST API endpoints
│   │   ├── db/                # SQLite database models & session setup
│   │   ├── schemas/           # Pydantic data schemas
│   │   ├── services/          # Embeddings, FAISS vector store, scoring, bias audit
│   │   └── main.py            # FastAPI application entrypoint
│   ├── tests/                 # Unit tests for scoring & bias audit
│   └── requirements.txt
├── frontend/
│   ├── app/                   # Next.js 14 App Router screens
│   ├── components/            # UI Modals, Radar charts, Chat widgets
│   ├── package.json
│   └── tailwind.config.js
├── legacy/                    # Archived Streamlit initial prototype
├── README.md
└── SmartHire new plan.md
```
