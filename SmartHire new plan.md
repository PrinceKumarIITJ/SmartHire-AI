# SmartHire AI — Complete Project Document
### AI-Powered Recruitment Intelligence Platform (Fast-Track Build)

---

## 1. Project Overview

**Name:** SmartHire AI
**Type:** Full-stack AI recruitment tool — an LLM-agent-orchestrated resume screening and candidate-matching platform
**Target role this supports:** AI Engineer (final-year BTech resume project)
**Build window:** 3 weeks, part-time
**Core idea:** A recruiter uploads a job description and a batch of resumes. An agent pipeline parses both, computes a semantic + rule-based match score per candidate, lets the recruiter chat with any candidate's resume in natural language, and produces a fairness/bias report on the shortlist — all through a real API and a professional web frontend, not a notebook or a single Streamlit script.

### Problem Statement
Manual resume screening is slow and inconsistent, and most public "AI resume screener" projects are single-file LLM-call demos with no persistence, no way to verify matching quality, and no awareness that automated hiring decisions are now a regulated area (NYC Local Law 144, EU AI Act "high-risk" classification for employment AI). SmartHire AI addresses both problems: it's engineered like a real product (typed data, persistent storage, a real API, a real frontend) and it treats fairness as a first-class feature, not an afterthought.

### Why This Project Fits an AI Engineer Application
Current AI Engineer hiring (2025–2026) centers on LLM orchestration, RAG pipelines, structured outputs/tool-calling, and shipping LLM features as real products — not model training/fine-tuning. This project directly demonstrates: agentic pipeline design (LangGraph), reliable structured extraction from LLMs, retrieval-augmented generation with a real vector store, and production concerns (persistence, API design, deployment) — while the bias-audit feature demonstrates responsible-AI awareness almost no competing student project has.

---

## 2. Objectives (Scope for This Build)

In scope for the 3-week build:
1. Reliable, structured LLM extraction (JD + resumes) — no regex JSON parsing
2. Persistent storage (PostgreSQL) with vector search (pgvector) replacing the current in-memory FAISS
3. A real backend API (FastAPI) — the frontend and pipeline talk over HTTP, not direct function calls
4. A professional web frontend (Next.js) with four core screens
5. Semantic + rule-based candidate–job matching (your existing scoring logic, kept and hardened)
6. Retrieval-augmented **candidate chat** — ask natural-language questions about a specific resume, grounded in retrieved chunks
7. A **bias/fairness audit**: demographic-blind scoring toggle + disparate-impact summary
8. **Personalized candidate email notifications** — selection and rejection emails, with rejection emails giving specific, constructive, skills-based feedback instead of a generic template (see Section 7A)
9. Basic automated tests, Docker Compose for one-command run, and a live deployment

Explicitly out of scope for this build (see Section 9 for the full reasoning): interview question generation, skill-gap/upskilling suggestions, JD quality/bias-language review, hiring-funnel analytics dashboard, drag-and-drop pipeline stages, full CI/CD, multi-org auth, fine-tuning.

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Orchestration | LangGraph (existing) | Explicit state machine over agent steps — already built, being hardened not replaced |
| LLM providers | Gemini + Groq (existing `llm_factory.py`), with real fallback between them | Multi-provider avoids vendor lock-in and rate-limit dead-ends; a real production pattern |
| Structured output | Native JSON mode / tool-calling (Gemini `response_schema`, or `instructor` over existing Pydantic models) | Replaces fragile regex-based JSON parsing — current single biggest reliability gap |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (existing) | Already integrated, free, fast enough locally |
| Vector storage | **pgvector** (inside Postgres) | One database instead of two moving parts — right complexity level for this scale, and it's what many real mid-size companies use in production |
| Database | PostgreSQL (Supabase free tier for deployment, local Postgres via Docker for dev) | Relational data (jobs, candidates, matches) and vectors in one place |
| Backend API | FastAPI (async) | Standard modern Python API framework, native async, auto-generated OpenAPI docs |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui | Current default stack for professional dashboard/internal-tool UIs; strong resume signal on its own |
| Testing | pytest (backend), a few scoring-function unit tests | Lightweight, not a full suite — time-boxed intentionally |
| Containerization | Docker Compose (API + Postgres + frontend) | One-command local run |
| Deployment | Backend → Render/Railway, Frontend → Vercel, DB → Supabase | All free-tier, standard pairing for this stack |

---

## 4. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Frontend — Next.js (TypeScript + Tailwind + shadcn/ui)    │
│  Job List → Upload & Run → Results Table → Candidate Detail │
│  (+ chat panel, + bias/fairness summary table)               │
└───────────────────────────┬──────────────────────────────┘
                             │ REST/JSON
┌───────────────────────────▼──────────────────────────────┐
│  Backend — FastAPI (async)                                  │
│  /jobs  /jobs/{id}/resumes  /jobs/{id}/run                  │
│  /jobs/{id}/results  /candidates/{id}  /candidates/{id}/chat │
│  /audit/{job_id}                                             │
└───────────────────────────┬──────────────────────────────┘
                             │
      ┌──────────────────────┼───────────────────────┐
      │                      │                        │
┌─────▼─────────┐   ┌─────────▼─────────┐   ┌─────────▼──────────┐
│ LangGraph Core  │   │ PostgreSQL +       │   │ Bias Audit Module   │
│ parse_jd →       │   │ pgvector           │   │ (blind-scoring       │
│ parse_resumes →  │   │ (jobs, candidates,  │   │  transform +         │
│ match → rank      │   │  matches, chat_logs)│   │  disparate-impact    │
│ (+ chat sub-graph  │   └────────────────────┘   │  report)             │
│  for RAG chat)     │                            └──────────────────────┘
└───────────────────┘
```

**Data flow for a single run:**
1. Recruiter creates a job (JD text) via frontend → `POST /jobs` → stored in Postgres.
2. Recruiter uploads resumes → `POST /jobs/{id}/resumes` → files parsed (PyMuPDF/pdfplumber, existing) → stored as `candidates` rows.
3. Recruiter triggers `POST /jobs/{id}/run` → LangGraph pipeline executes: structured JD parse → structured resume parse (per candidate) → embed + store in pgvector → semantic + rule-based scoring (existing weighted formula) → results persisted to `job_candidate_matches`.
4. Frontend polls/fetches `GET /jobs/{id}/results` → renders ranked table with score breakdown.
5. Recruiter opens a candidate → chat panel → each message hits `POST /candidates/{id}/chat` → retrieves top-k resume chunks from pgvector → LLM generates a grounded answer.
6. Recruiter views `GET /audit/{job_id}` → blind-scoring re-run + disparate-impact summary table.

---

## 5. Database Schema

```sql
-- jobs
id UUID PK
title TEXT
raw_jd TEXT
parsed_jd JSONB          -- structured JobDescription (existing Pydantic model)
created_at TIMESTAMP

-- candidates
id UUID PK
job_id UUID FK -> jobs
raw_resume_text TEXT
parsed_profile JSONB     -- structured CandidateProfile (existing Pydantic model)
resume_embedding VECTOR(384)   -- pgvector, MiniLM dimension
created_at TIMESTAMP

-- resume_chunks   (for RAG chat retrieval)
id UUID PK
candidate_id UUID FK -> candidates
chunk_text TEXT
chunk_embedding VECTOR(384)
chunk_order INT

-- job_candidate_matches
id UUID PK
job_id UUID FK -> jobs
candidate_id UUID FK -> candidates
semantic_score FLOAT
skill_score FLOAT
experience_score FLOAT
education_score FLOAT
project_score FLOAT
final_score FLOAT
matched_skills JSONB
missing_skills JSONB
llm_explanation TEXT
created_at TIMESTAMP

-- chat_logs
id UUID PK
candidate_id UUID FK -> candidates
role TEXT                -- 'user' | 'assistant'
message TEXT
created_at TIMESTAMP

-- audit_reports
id UUID PK
job_id UUID FK -> jobs
blind_scores JSONB
disparate_impact_summary JSONB
created_at TIMESTAMP
```

This keeps your existing `JobDescription`, `CandidateProfile`, and `MatchResult` Pydantic models intact — they map directly onto the `JSONB` columns above, so you're persisting the same typed objects you already produce, not redesigning them.

---

## 6. API Specification

| Endpoint | Method | Purpose |
|---|---|---|
| `/jobs` | POST | Create a job from JD text; triggers structured JD parsing |
| `/jobs` | GET | List all jobs |
| `/jobs/{id}` | GET | Get job detail (parsed JD) |
| `/jobs/{id}/resumes` | POST | Upload one or more resume files; triggers structured parsing + embedding |
| `/jobs/{id}/run` | POST | Run the matching pipeline (scoring) for all uploaded candidates against the job |
| `/jobs/{id}/results` | GET | Ranked candidate list with score breakdown |
| `/candidates/{id}` | GET | Full candidate profile |
| `/candidates/{id}/chat` | POST | Send a chat message; returns grounded answer + which resume chunk(s) it used |
| `/audit/{job_id}` | GET | Run/fetch the bias & disparate-impact report for a job's candidate batch |

All endpoints return typed JSON matching the Pydantic models — FastAPI auto-generates OpenAPI/Swagger docs from these, useful both for your own testing and as something you can screenshot for documentation.

---

## 7. Agent Pipeline Detail (LangGraph)

**Main graph (batch, per job run):**
```
parse_jd → parse_resumes (per candidate) → embed_and_store → match → rank → persist_results
```
- `parse_jd`, `parse_resumes`: your existing nodes, hardened with structured output (tool-calling / native JSON mode) instead of `safe_json_parse()`.
- `embed_and_store`: new — chunks each resume, embeds chunks + full profile, writes to pgvector.
- `match`: your existing weighted scoring (semantic 0.4, skill 0.2, experience 0.2, project 0.1, education 0.1) — logic unchanged, just now reading/writing Postgres instead of session state.
- `rank`, `persist_results`: sort by final score, write to `job_candidate_matches`.

**Chat sub-graph (per message, on-demand):**
```
embed_query → retrieve_top_k_chunks → generate_grounded_answer
```
Small, separate from the batch graph — triggered by the `/candidates/{id}/chat` endpoint, not part of the linear pipeline.

**Reliability layer (applies to every LLM call in both graphs):**
- Structured output via tool-calling/native JSON schema — no free-text parsing.
- Retry only on actual rate-limit/5xx errors (fixes current blanket-retry bug).
- Automatic fallback: Gemini fails after retries → fallback to Groq, logged per request (which provider actually served each call).

---

## 7A. Personalized Candidate Email Notifications

Your original project already had `email_agent.py` (SMTP-based selection/rejection mail). This build keeps that infrastructure but upgrades what actually goes into the email — instead of a generic "unfortunately you were not selected" template, the rejection email is grounded in the actual match data your pipeline already computed for that candidate: their sub-scores, matched skills, and specifically their `missing_skills`. This is a small addition on top of what you already have, not a new subsystem.

**Design principles (important to get right, and worth stating explicitly in your README):**
- **Skills-based only, never demographic.** The email is generated strictly from `missing_skills`, sub-scores, and the JD's requirements — the generation prompt is explicitly constrained to never reference name-inferable attributes, age, gender, or anything the bias-audit module already exists to guard against.
- **Human-in-the-loop, not fully automatic send.** The pipeline *drafts* the email; the recruiter reviews and approves before it sends. This mirrors how a real product would ship this (companies are cautious about detailed rejection reasoning for legal-risk reasons — an inaccurate or poorly-worded "why you were rejected" can itself become the basis for a complaint), and it's a more defensible design than "AI decides and auto-sends," which is also a stronger answer if an interviewer pushes on it.
- **Constructive framing.** Rejection emails name 1–2 specific skill gaps and frame them as concrete next steps ("this role emphasized production Kubernetes experience, which wasn't reflected in your resume") rather than just stating a score didn't clear a bar.
- **Selection emails** follow the same pattern in the positive direction — referencing specific matched strengths, not just "you're selected."

**Pipeline addition:** one new LangGraph node, `draft_candidate_email`, runs after `rank` for candidates below/above a configurable shortlist threshold. It takes the existing `MatchResult` (already computed — no new scoring logic) and generates a draft subject + body via the same structured-output-hardened LLM call pattern used elsewhere in the pipeline.

**Schema addition:**
```sql
-- email_drafts
id UUID PK
candidate_id UUID FK -> candidates
job_id UUID FK -> jobs
type TEXT              -- 'selection' | 'rejection'
subject TEXT
body TEXT
status TEXT             -- 'draft' | 'approved' | 'sent'
sent_at TIMESTAMP NULL
created_at TIMESTAMP
```

**API additions:**
| Endpoint | Method | Purpose |
|---|---|---|
| `/jobs/{id}/draft-emails` | POST | Generate draft selection/rejection emails for all scored candidates in a job |
| `/email-drafts/{id}` | GET / PATCH | View or edit a draft before sending |
| `/email-drafts/{id}/send` | POST | Recruiter-approved send (uses existing SMTP logic from `email_agent.py`) |

**Frontend addition:** on the Results Table screen, a "Generate Notification Drafts" action; each candidate row gets a small "Preview email" link opening the draft in an editable modal with Approve & Send / Edit buttons — no separate screen needed.

**Effort:** roughly half a day to a day — it's one new node reusing existing data, one small table, three thin endpoints, and one modal in the UI. Fits into Week 3 alongside the bias audit work (Section 10).

---

## 8. Frontend Detail

Four screens, deliberately minimal:

1. **Job List** — cards/table of created jobs, "New Job" button opens a form (title + JD text).
2. **Upload & Run** — per-job screen: resume upload dropzone (multi-file), "Run Matching" button, progress state while the pipeline runs.
3. **Results Table** — ranked candidates, final score + sub-score breakdown (bar/radar chart reusing your existing scoring fields), matched/missing skill chips, and the **bias audit summary table** (blind-scoring toggle + disparate-impact numbers) shown inline on this same screen rather than a separate analytics page.
4. **Candidate Detail** — full parsed profile, LLM match explanation, and the **chat panel** (message list + input, each answer showing which resume section it was grounded in).

Design direction: keep the existing charcoal/burgundy visual identity from your prior documentation work rather than defaulting to generic shadcn/ui styling — a dashboard with a deliberate, specific look reads as considerably more "shipped product" than default component-library styling, for the same amount of build time.

---

## 9. What's Explicitly Excluded (and Why)

| Excluded | Reasoning |
|---|---|
| Interview question generator | Same underlying pattern as existing LLM calls — no new technical signal, cut to protect time for RAG chat and bias audit, which are the two highest-signal new features |
| Skill-gap/upskilling suggestions | Same reasoning as above |
| JD Quality/bias-language review agent | Good feature, but lower signal-per-hour than the candidate chat — first thing to add back if time allows |
| Hiring funnel analytics dashboard | Cosmetic; the bias audit table alone covers the "responsible AI" story |
| Drag-and-drop Kanban pipeline stages | UI polish, not a technical differentiator; a simple status field is enough for this build |
| Full CI/CD pipeline | A few local tests are enough signal for a 3-week solo project; a full pipeline costs days for a green badge |
| Multi-org auth / RBAC | Enterprise-scope concern, unnecessary for a portfolio demo |
| Fine-tuning any model | Irrelevant to AI Engineer (vs. ML Researcher) roles, adds cost and time for no interview-relevant signal |
| Dedicated vector DB service (Pinecone/Weaviate) | pgvector inside the existing Postgres instance is the right complexity level and mirrors real mid-size-company setups |
| Celery/Redis task queue | FastAPI `BackgroundTasks` is sufficient for this scale of batch processing |

---

## 10. Timeline (3 Weeks, Day-by-Day)

### Week 1 — Backend Spine
- **Day 1–2:** Repo restructure (`backend/`, `frontend/`), Docker Compose with Postgres running.
- **Day 2–3:** Structured-output fix across `resume_agent.py`, `jd_agent.py`, `llm_factory.py`; fix retry logic; add provider fallback.
- **Day 4–5:** Postgres schema + pgvector column, migrate pipeline off `st.session_state`.
- **Day 5–7:** FastAPI endpoints (`/jobs`, `/jobs/{id}/resumes`, `/jobs/{id}/run`, `/jobs/{id}/results`, `/candidates/{id}`).
- ✅ Checkpoint: pipeline runs end-to-end via API, verified in Swagger UI.

### Week 2 — Frontend + RAG Chat
- **Day 1–3:** Next.js scaffold, all 4 screens wired to the API (no chat yet).
- **Day 3–5:** Resume chunking + pgvector storage, `/candidates/{id}/chat` endpoint (retrieve → generate), chat panel in Candidate Detail screen.
- **Day 6–7:** Buffer for RAG chat bugs — this is the trickiest new piece, give it real room.
- ✅ Checkpoint: full flow works in the real UI — create job → upload → run → results → chat.

### Week 3 — Bias Audit, Tests, Deploy
- **Day 1–2:** Demographic-blind scoring toggle + disparate-impact summary table (computed over a small synthetic test batch you prepare).
- **Day 2–3:** Personalized email drafting node (`draft_candidate_email`) + `email_drafts` table + draft/edit/send endpoints, wired to your existing SMTP logic; preview/approve modal on the Results screen.
- **Day 3–4:** Unit tests for scoring functions; manual pass on error states (empty resume, malformed PDF, missing API key) so nothing crashes in a live demo.
- **Day 5:** Deploy — Render/Railway (backend), Vercel (frontend), Supabase (DB).
- **Day 5–7:** README (architecture diagram, setup steps, "Engineering Decisions" section), 60–90 second demo GIF.
- ✅ Checkpoint: live link, polished repo, ready for your resume.

---

## 11. Testing Plan (Scoped)

- Unit tests: scoring sub-functions (semantic, skill, experience, education, project scoring) — pure functions, fast to write, still demonstrates you test your logic.
- One integration-style test: run the full LangGraph pipeline against a mocked LLM response, assert it produces a valid `MatchResult`.
- Manual QA pass: empty/garbled resume upload, missing API key, LLM provider timeout (should trigger fallback, not crash).
- No full CI pipeline this round (see Section 9) — can be added later as a fast follow-up if time allows.

---

## 12. Deployment Plan

| Component | Platform | Notes |
|---|---|---|
| Backend (FastAPI) | Render or Railway (free tier) | Set env vars for Gemini/Groq API keys, DB connection string |
| Frontend (Next.js) | Vercel | Native fit for Next.js, zero-config deploys from GitHub |
| Database | Supabase | Postgres + pgvector supported natively, generous free tier |
| Local dev | Docker Compose | One command boots API + Postgres + frontend together |

---

## 13. Resume Positioning

**Project title:** SmartHire AI — AI-Powered Recruitment & Candidate Matching Platform

**Bullets:**
- Built a full-stack AI recruitment tool (Next.js, FastAPI, PostgreSQL+pgvector) orchestrating a LangGraph agent pipeline for structured resume parsing and semantic candidate–job matching.
- Implemented a retrieval-augmented chat interface letting recruiters query individual candidate resumes in natural language, grounded in pgvector-retrieved resume chunks.
- Designed a bias-aware scoring mode (demographic-blind extraction + disparate-impact reporting) addressing fairness concerns in automated hiring decisions.
- Built a personalized candidate notification system generating specific, skills-based rejection/selection feedback grounded in match data, with a human-in-the-loop review step before sending.
- Replaced ad-hoc LLM JSON parsing with structured/tool-calling outputs and multi-provider fallback (Gemini/Groq), improving pipeline reliability.
- Deployed with Docker Compose across Vercel/Render/Supabase, with a live demo link and automated tests for core scoring logic.

**Likely interview questions this sets you up for:**
- "Why pgvector instead of a dedicated vector DB?" → cost/complexity tradeoff at this scale, one less moving part, mirrors real mid-size-company architecture.
- "How does the chat feature avoid hallucinating about a candidate?" → retrieval grounding, answer generation constrained to retrieved chunks, cite which section was used.
- "What happens if the LLM returns malformed output?" → structured output/tool-calling + provider fallback chain, explain the before/after reliability difference.
- "How would the bias audit change with real candidate data at scale?" → be direct about the limits of a synthetic-batch demonstration — shows maturity, not a weakness.
- "Why FastAPI + Next.js instead of just Streamlit?" → separation of concerns, a UI-agnostic API contract, and it's simply what a production LLM app's architecture actually looks like.

---

Ready to start building. Suggest beginning with **Week 1, Day 1** — repo restructure and Docker Compose setup — followed immediately by the structured-output fix, since that touches your existing agent files directly. Want me to start there?