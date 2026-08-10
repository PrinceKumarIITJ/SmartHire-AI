# SmartHire AI — Multi-Agent Recruitment Intelligence Platform

**SmartHire AI** is a production-grade full-stack AI recruitment platform that orchestrates **specialized AI agents** using **LangGraph**, **Gemini 2.5 Flash**, **FastAPI**, **Next.js 14**, **SQLite**, and **FAISS** to deliver structured resume parsing, Explainable AI (XAI) candidate ranking, demographic-blind bias auditing, RAG candidate resume chat, and human-in-the-loop candidate email drafting.

---

## 🌟 Key Features

1. **Agent Orchestration (LangGraph)**:
   - **JD Agent**: Structured Job Description extraction using Pydantic schemas.
   - **Resume Agent**: Automated structured profile parsing from PDF/DOCX resumes.
   - **Matching Agent**: Hybrid semantic + rule-based scoring producing **Explainable AI (XAI)** sub-scores, skill match matrices, and reasoning text.
   - **Analysis Agent (Bias Audit & Executive Report)**: Demographic-blind re-scoring, 80% rule (4/5ths) Disparate Impact audit, and AI Executive Hiring Reports.
   - **Communication Agent (RAG Chat & Email Drafts)**: RAG search over FAISS resume chunks with chunk citations, and skills-grounded selection/rejection draft emails requiring recruiter review before sending via SMTP.

2. **Modular Prompt Management**:
   - Prompt templates decoupled from Python code in `backend/app/prompts/` (`jd_prompt.txt`, `resume_prompt.txt`, `matching_prompt.txt`, `chat_prompt.txt`, `report_prompt.txt`, `email_prompt.txt`, `bias_prompt.txt`).

3. **Hardened LLM Infrastructure**:
   - Powered by **Gemini 2.5 Flash** with automatic fallback to **Groq (`llama-3.3-70b-versatile`)**.
   - Native Pydantic structured output (`.with_structured_output()`) and exponential backoff retries for 429 rate limit errors.

4. **Modern Decoupled Full-Stack Architecture**:
   - **Backend**: FastAPI RESTful API with async SQLAlchemy SQLite ORM & FAISS vector storage.
   - **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS with dark mode, glassmorphism aesthetics, radar charts, and interactive review modals.

---

## 🏗️ System Architecture

```
                 ┌─────────────────────────────┐
                 │       Next.js Frontend      │
                 │                             │
                 │ Jobs | Upload | Results     │
                 │ Candidate | Reports | Chat  │
                 └──────────────┬──────────────┘
                                │ REST API (/api/v1/)
                                ▼
                 ┌─────────────────────────────┐
                 │       FastAPI Backend       │
                 └──────────────┬──────────────┘
                                │
                 ┌──────────────┼──────────────┐
                 ▼              ▼              ▼
             SQLite          FAISS        LangGraph
             Database      Vector Store     Agents
                                │              │
                                │              ├── JD Agent
                                │              ├── Resume Agent
                                │              ├── Matching Agent
                                │              ├── Analysis Agent
                                │              └── Communication Agent
                                │
                                ▼
                        Gemini 2.5 Flash
                                │
                           Groq Fallback
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

## 🧪 Running Automated Tests

Run unit & integration tests:

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
│   │   ├── api/routers/       # FastAPI REST API endpoints (/api/v1/)
│   │   ├── db/                # SQLite database models & session setup
│   │   ├── prompts/           # External prompt template files (.txt)
│   │   ├── schemas/           # Pydantic data schemas
│   │   ├── services/          # Embeddings, FAISS vector store, scoring, bias audit
│   │   └── main.py            # FastAPI application entrypoint
│   ├── tests/                 # Unit & integration test suites
│   └── requirements.txt
├── frontend/
│   ├── app/                   # Next.js 14 App Router screens
│   ├── components/            # UI Modals, Radar charts, Chat widgets
│   ├── package.json
│   └── tailwind.config.js
├── README.md
└── SmartHire new plan.md
```

---

## 💡 Resume Positioning Highlights

- **Architected an AI recruitment platform using LangGraph, Gemini 2.5 Flash, FastAPI, and Next.js, orchestrating specialized agents for structured job/resume extraction, hybrid candidate matching, and recruitment analysis.**
- **Built an explainable hybrid matching pipeline combining semantic embeddings with deterministic scoring to rank candidates while surfacing matched skills, missing skills, and evidence-based reasoning.**
- **Implemented RAG-based candidate chat using FAISS and sentence-transformer embeddings, enabling recruiters to query resumes in natural language with responses grounded in retrieved resume sections.**
- **Developed a responsible-AI fairness audit using demographic-blind re-scoring and disparate-impact analysis to identify potential bias in automated candidate ranking.**
- **Implemented human-in-the-loop AI workflows for executive hiring reports and personalized candidate communication, requiring recruiter review before email delivery.**
