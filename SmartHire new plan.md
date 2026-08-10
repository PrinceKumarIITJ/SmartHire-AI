# SmartHire AI — Final Implementation Plan

## 1. Project Goal

Build **SmartHire AI**, a full-stack AI recruitment intelligence platform that helps recruiters:

1. Upload a Job Description.
2. Upload multiple resumes.
3. Extract structured information using LLMs.
4. Match candidates using **hybrid semantic + rule-based scoring**.
5. Explain why candidates received their scores.
6. Chat with individual resumes using **RAG**.
7. Audit the shortlist for potential bias.
8. Generate an executive hiring summary.
9. Generate candidate email drafts that require recruiter approval.

### Main objective

The project should demonstrate:

**LLM Engineering + Agentic AI + RAG + Structured Outputs + Explainable AI + Responsible AI + Full-stack development**

—not database or infrastructure complexity.

---

## 2. Final Tech Stack

| Layer               | Technology                               |
| ------------------- | ---------------------------------------- |
| Frontend            | Next.js 14 + TypeScript                  |
| UI                  | Tailwind CSS + shadcn/ui                 |
| Backend             | FastAPI                                  |
| Database            | **SQLite**                               |
| Vector Search       | **FAISS**                                |
| Embeddings          | `sentence-transformers/all-MiniLM-L6-v2` |
| Agent Orchestration | LangGraph                                |
| LLM Primary         | **Gemini 2.5 Flash**                     |
| LLM Fallback        | Groq `llama-3.3-70b-versatile`           |
| Validation          | Pydantic                                 |
| Testing             | pytest                                   |
| Deployment          | Vercel + Render                          |

---

## 3. System Architecture

```text
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

## 4. Prompt Management

Prompt templates are modularized under `backend/app/prompts/`:

```text
backend/app/prompts/
├── jd_prompt.txt
├── resume_prompt.txt
├── matching_prompt.txt
├── chat_prompt.txt
├── report_prompt.txt
├── email_prompt.txt
└── bias_prompt.txt
```

---

## 5. Final Resume Positioning

- **Architected an AI recruitment platform using LangGraph, Gemini 2.5 Flash, FastAPI, and Next.js, orchestrating specialized agents for structured job/resume extraction, hybrid candidate matching, and recruitment analysis.**
- **Built an explainable hybrid matching pipeline combining semantic embeddings with deterministic scoring to rank candidates while surfacing matched skills, missing skills, and evidence-based reasoning.**
- **Implemented RAG-based candidate chat using FAISS and sentence-transformer embeddings, enabling recruiters to query resumes in natural language with responses grounded in retrieved resume sections.**
- **Developed a responsible-AI fairness audit using demographic-blind re-scoring and disparate-impact analysis to identify potential bias in automated candidate ranking.**
- **Implemented human-in-the-loop AI workflows for executive hiring reports and personalized candidate communication, requiring recruiter review before email delivery.**