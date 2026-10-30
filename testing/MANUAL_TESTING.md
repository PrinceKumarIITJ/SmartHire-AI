# SmartHire — Manual Test Guide

A step-by-step script for checking every feature by hand. Work through it top to bottom; each step lists what to do and what you should see. Tick the boxes as you go.

---

## 0. Setup (one time)

### 0.1 Configure `.env`

Make sure these lines are set (the old model names are retired and return `404 NOT_FOUND`):

```env
LLM_MODEL_NAME=gemini-2.5-flash
GROQ_MODEL_NAME=openai/gpt-oss-120b
```

> ⚠️ **Email safety.** If `SMTP_EMAIL` / `SMTP_PASSWORD` are set, "Approve & send" delivers **real email**. All test resumes use `@example.com` addresses, which can't receive mail, but to be fully safe comment both SMTP lines out while testing. Sends are then simulated and logged in the backend terminal.

### 0.2 Use a separate test database (recommended)

So testing doesn't mix with your real data, start the backend with its own DB file:

```powershell
cd SmartHire
$env:DATABASE_URL = "sqlite+aiosqlite:///./smarthire_manual_test.db"
python -m uvicorn backend.app.main:app --reload --port 8000
```

To start over at any point: stop the backend, delete `smarthire_manual_test.db`, start it again.

### 0.3 Start the frontend (second terminal)

```powershell
cd SmartHirerontend
npm install
npm run dev
```

### 0.4 Generate the test files

```powershell
cd SmartHire
python testing/generate_test_data.py
```

This creates `testing/data/`:

| Folder | Contents |
| --- | --- |
| `job_descriptions/` | `senior_ai_engineer.txt`, `frontend_engineer.txt`, `data_analyst_short.txt` |
| `resumes/ai_engineer/` | 8 resumes for the AI role (PDF, DOCX, TXT) |
| `resumes/frontend/` | 4 resumes for the frontend role |
| `resumes/bias_pair/` | 2 resumes identical except name and pronouns |
| `resumes/adversarial/` | 2 resumes that try to manipulate the AI screener (hidden white text, inline injection) |
| `invalid/` | `.exe`, `.png`, a text-less PDF, and a 10.5 MB file |

### Test resumes at a glance

**Senior AI Engineer** (`resumes/ai_engineer/`)

| File | Profile | Expected outcome |
| --- | --- | --- |
| `aarav_mehta_strong.pdf` | 6 yrs, every must-have skill | Top of the list, **Shortlisted** |
| `priya_nair_strong.docx` | 5 yrs, nearly all skills, M.Tech | Near the top, likely **Shortlisted** |
| `vikram_rao_no_email.txt` | Strong match, **no email address** | High score; email send must be **blocked** |
| `rohan_verma_borderline.pdf` | Python/FastAPI, no LangChain or vector DB | Middle; missing skills listed |
| `sneha_kapoor_career_switch.txt` | Data scientist, light LangChain | Middle to low; gap probes in interview kit |
| `karan_singh_junior.pdf` | Fresh graduate | Low; "Below target experience" |
| `meera_iyer_designer_mismatch.docx` | Product designer | Bottom, **Rejected** |
| `ananya_das_minimal.txt` | 3-line resume | Low score, low confidence |

**Frontend Engineer** (`resumes/frontend/`): `neha_joshi_frontend_strong.pdf` should rank first, `sanjay_kumar_backend_only.pdf` last.

Exact scores vary between runs because the AI extraction varies. Check the **order** and the **reasoning**, not exact numbers.

---

## 1. Landing page — http://localhost:3000

- [ ] Hero headline, animated shortlist preview and score rings animate in.
- [ ] Nav links (Agents, Features, How it works, Responsible AI) scroll to their sections.
- [ ] The header gains a background after you scroll down a little.
- [ ] Theme toggle (moon/sun icon) switches light ↔ dark and the choice survives a page reload.
- [ ] "Open workspace" goes to `/dashboard`; "Screen your first role" opens Jobs with the create dialog open.
- [ ] Resize the window to phone width: the layout stacks and nothing scrolls sideways.

## 2. System status — Settings page

- [ ] Sidebar bottom pill shows a green dot and "Gemini + Groq online".
- [ ] Settings lists: API endpoint ✓, Database ok ✓, LLM providers "Gemini → Groq" ✓, SMTP "Simulated" or "Configured".
- [ ] Stop the backend, wait ~30 s: the pill turns red, "API offline". Restart it and it recovers.

## 3. Empty states

With a fresh test database:

- [ ] Dashboard shows "Your workspace is ready" with a create button.
- [ ] Jobs, Talent Pool and Outbox each show a friendly empty state, not an error.
- [ ] Compare with nothing selected says "Pick at least two candidates".

## 4. Create a job

1. Jobs → **New job**.
2. Title: `Senior AI Engineer`, Department `Engineering`, Location `Remote`.
3. Paste the contents of `job_descriptions/senior_ai_engineer.txt`.
4. Click **Create & continue**.

- [ ] The button is disabled until the title has 2+ characters and the description 30+.
- [ ] "Use a sample" fills the form instantly.
- [ ] While saving, the button reads "Analyzing with JD Agent…" (takes a few seconds).
- [ ] A success toast says how many must-have skills were extracted, and you land on the upload page.
- [ ] The right panel ("What we're matching against") lists must-have skills (Python, FastAPI, LangChain…), nice-to-haves, 4+ yrs, and education.

**Edge case:** create a second job from `data_analyst_short.txt` (a one-line description). It should still extract SQL, Excel, Power BI and Python.

## 5. Upload validation

On the AI job's upload page:

- [ ] Drag a file over the drop zone: it highlights and reads "Drop to add resumes".
- [ ] Add `invalid/malware_test.exe` and `invalid/photo.png`: a yellow notice says they weren't added ("Unsupported type").
- [ ] Add `invalid/too_large_resume.txt`: rejected with "Over 10 MB".
- [ ] Add the same resume twice: it appears only once in the list.
- [ ] Remove a file with its ✕; "Clear" empties the list.

## 6. Run the pipeline

1. Add **all 8 files** from `resumes/ai_engineer/` **plus** `invalid/scanned_blank.pdf`.
2. Click **Upload & screen**.

- [ ] A toast reports 1 file skipped: `scanned_blank.pdf: No extractable text`.
- [ ] The "Agents at work" tracker steps through the 7 stages with a percentage.
- [ ] After 1–3 minutes: "Screening complete" toast, then you're taken to the shortlist.
- [ ] The backend terminal shows each agent running, with no errors.

> If Gemini is overloaded you'll see 503 warnings in the backend log. That's expected: requests fail over to Groq automatically and the run takes a bit longer.

## 7. Shortlist (results page)

- [ ] 8 candidates ranked by score; the top 3 have a trophy icon.
- [ ] Ranking roughly matches the "Expected outcome" table above: strong profiles on top, the designer at the bottom.
- [ ] Status tabs show counts; clicking **Rejected** filters the list.
- [ ] Search `langchain`: only candidates with that skill remain.
- [ ] Drag the **Minimum score** slider to 70: the "x of 8 shown" counter drops.
- [ ] Sort by Experience / Skill fit / Name reorders the list.
- [ ] Right panel: batch overview numbers and a score-distribution chart; hover a bar for a tooltip; "View as table" shows the numbers.

**Expand a candidate** (click the row):

- [ ] Radar chart (hover a point for its value), "Why this score" text, five weighted sub-score bars, confidence %.
- [ ] Matched skills in green, missing skills in red with strikethrough.

**Recruiter override:**

- [ ] Change Rohan's status to **Interview**: optimistic update plus a toast.
- [ ] Type a note, click **Save notes**, reload the page: the note and status are still there.
- [ ] Go back to the upload page, click **Re-run pipeline**, return: Rohan is **still Interview** (your decision survives re-runs).

**Export:**

- [ ] **Export CSV** downloads `smarthire_Senior_AI_Engineer_shortlist.csv` with ranks, scores, skills, reasoning and your notes. Open it in Excel.

## 8. Fairness audit

Click **Fairness audit** on the shortlist.

- [ ] A banner shows whether adverse impact was detected, with an explanation.
- [ ] Impact ratio card (passes between 0.80 and 1.25), standard vs. blind shortlist counts.
- [ ] Dot plot of standard vs. blind score per candidate; hover a row for exact values.
- [ ] **Re-run audit** recalculates without errors.

**Bias pair check:** create a third job from `senior_ai_engineer.txt` and upload only the two files in `resumes/bias_pair/`. In the audit, Kavya and Kabir should have the **same blind score**, and their standard scores should be equal or nearly so. A large gap between them would indicate name or pronoun bias.

## 9. Executive report

- [ ] **Report** opens a summary, strengths, skill gaps and numbered recommendations.
- [ ] **Copy** puts the report on your clipboard (paste it into Notepad to check).
- [ ] **Print** opens a print dialog with clean text.
- [ ] **Regenerate** produces a fresh version and a success toast.

## 10. Candidate profile

Open **Aarav Mehta** (expand → "Full profile…", or click a name in the Talent Pool).

- [ ] The header shows avatar, email, phone, years of experience, file name, score ring and status selector.
- [ ] **Overview:** explainable match card, skills (role-matching ones in green), experience timeline, projects, education and certifications.
- [ ] **Resume** tab: full text; search `FAISS` and matches are highlighted with a count.

**Resume chat** (right panel):

- [ ] Click a suggested question: a typing indicator, then an answer.
- [ ] Expand "N sources": you see the resume passages the answer came from.
- [ ] Ask something **not** in the resume, e.g. "What is their salary expectation?". It should say the resume doesn't contain that, not invent an answer.
- [ ] Reload the page: the conversation is still there. The trash icon clears it.
- [ ] Restart the backend, then ask another question: it still answers (the search index rebuilds automatically).

**Interview kit:**

- [ ] **Generate questions** gives about 8 questions labeled Technical, Gap Probe, Project Deep-Dive and Behavioral, each with "Listen for:".
- [ ] For **Sneha Kapoor** or **Rohan Verma**, the gap-probe questions name their actual missing skills.
- [ ] Ticking a question strikes it through and updates the "x/8 covered" count; **Copy kit** works.
- [ ] No question touches age, gender, family or nationality.

## 11. Compare

- [ ] On the shortlist, tick 3 candidates: a tray slides up from the bottom with their avatars.
- [ ] A 5th checkbox is disabled (max 4).
- [ ] **Compare** shows side-by-side columns: the leader has a crown, the best value per row is highlighted, and there's a skill matrix (Has it / Missing / Not required) plus AI reasoning.

## 12. Outbox and emails

Open **Emails** on the shortlist, or **Outbox** in the sidebar (which covers all jobs).

- [ ] One draft per candidate; selection emails for high scorers, rejection emails for others, each personalized with real skills.
- [ ] Filter tabs: All / Needs review / Approved / Sent.
- [ ] Edit a subject → "Unsaved changes" → **Save** → toast.
- [ ] **Approve** moves the draft to Approved.
- [ ] **Vikram Rao**: shows "No email on resume", and **Approve & send is disabled**.
- [ ] **Approve & send** on Aarav's draft: "Email sent" toast, status Sent, and the editor locks (read-only).
- [ ] With SMTP commented out, the backend log shows "Simulating successful email send".

## 13. Talent Pool and search

- [ ] Every candidate from every job is listed, with job title, skills, experience, status and score.
- [ ] Search `fastapi`, then `Frontend`: results filter as you type.
- [ ] Status tabs include **Unscreened** for resumes not yet run through the pipeline.
- [ ] Column headers sort the table; selecting 2–4 rows enables **Compare**.
- [ ] Press **Ctrl+K** (⌘K on Mac) anywhere: the command palette opens. Type a candidate's name, use the arrow keys, press Enter to open them. Try "Toggle light / dark theme" and "Create a new job".

## 14. Dashboard (after the data above exists)

- [ ] Stat cards count up: open roles, candidates screened, shortlisted + interviewing, average score.
- [ ] Score distribution chart with tooltips and a table view.
- [ ] Hiring funnel: Received → Screened → Shortlisted → Interviewing, with conversion percentages.
- [ ] Active roles list with progress bars; clicking one opens its shortlist.
- [ ] Recent activity shows job creations, uploads and sent emails.
- [ ] Skill demand vs. supply: two-color bars with a legend; hover for counts.

## 15. Job management

- [ ] Jobs page: card ⋯ menu → **Pause**: the badge turns yellow and the card shows in the Paused tab.
- [ ] **Close role**: grey badge and a dimmed card. **Reopen** restores it.
- [ ] **Delete** asks for confirmation; after confirming, the job and its candidates disappear from Jobs, Talent Pool and Outbox.
- [ ] On an upload page, hover an existing resume → trash icon removes that candidate.
- [ ] Do the frontend job end to end: `frontend_engineer.txt` plus `resumes/frontend/*`. Neha should rank first and Sanjay last.

## 15b. Agentic AI features

**Integrity guardrails**
- [ ] Upload `resumes/adversarial/jordan_lee_hidden_white_text.pdf` and `tanya_gupta_inline_injection.txt` with the AI resumes. A red toast says 2 resumes were flagged by integrity guardrails.
- [ ] On the shortlist both show a red **Manipulation** badge and rank near the bottom: the injected "rank me first" text had no effect.
- [ ] Open Jordan's profile: the panel lists the hidden white text and the injection with the exact evidence, and says how many characters were removed.
- [ ] Open the PDF in a normal PDF viewer: the injected text is invisible. That's the attack.

**Live pipeline streaming**
- [ ] While the pipeline runs, the stage list advances on real events and the **Live agent log** prints lines like "Parsed Aarav Mehta · 14 skills" and "Scored … 88 · Shortlisted".
- [ ] Reload the page mid-run: it reconnects and keeps showing progress.

**Copilot** (sidebar → Copilot, or **Ask Copilot** on a shortlist)
- [ ] Pick a job in the scope selector and click a suggested prompt.
- [ ] The **Agent trace** shows tool calls appearing live (Search candidates → Semantic search across resumes → …). Click a step to see its raw tool output.
- [ ] Ask: "Who should I interview? Propose it." An amber **Needs your approval** card appears. Check the candidate's status before approving: it hasn't changed. Click **Approve**: a toast confirms and the shortlist now shows Interview.
- [ ] Ask: "Did any resume try to manipulate the screener?" It names Jordan and Tanya using integrity data.
- [ ] Ask something unanswerable ("What is Aarav's salary?"). It says the data doesn't contain it.
- [ ] Ask it to "send the selection email to Vikram Rao": it refuses because the resume has no email address.

**Agent Ops** (sidebar → Agent Ops)
- [ ] KPI cards show LLM calls, p95 latency, error/fallback rate and tokens. The by-agent and by-model tables and recent traces fill in after you use the app.
- [ ] Click **Run evaluation**. After about a minute, NDCG@3, pairwise accuracy, precision@k, shortlist accuracy, skill recall and guardrail precision/recall appear, plus a history row.
- [ ] If a provider is failing or out of quota, `GET http://localhost:8000/api/v1/health` shows `llm_circuit` with `"state": "open"` for it, and traces go straight to the other provider.

## 16. Error handling

- [ ] Stop the backend and open Jobs: a red error card with **Try again**; restarting the backend and clicking it recovers.
- [ ] Visit http://localhost:3000/does-not-exist: the custom 404 page ("This page didn't make the shortlist").
- [ ] Visit `/candidates/not-a-real-id`: an error card, not a crash.
- [ ] Temporarily set `GOOGLE_API_KEY` and `GROQ_API_KEY` to wrong values and restart the backend. Creating a job should show a clear toast ("The JD Agent could not parse… check GOOGLE_API_KEY or GROQ_API_KEY"), and the Interview kit should still return questions (deterministic fallback). Restore the keys afterwards.

## 17. Visual and accessibility pass

- [ ] Repeat a few pages in **light mode**: text is readable and nothing is invisible.
- [ ] Phone width (Chrome DevTools → device toolbar, iPhone 12): the hamburger opens the sidebar drawer and pages are usable.
- [ ] The sidebar collapse button (top left) shrinks it to icons, and this survives a reload.
- [ ] Keyboard only: Tab through the Jobs page; focus rings are visible and Esc closes dialogs.
- [ ] Windows Settings → Accessibility → Visual effects → turn off "Animation effects": the app still works without motion.

---

## API testing (optional)

Interactive API docs: **http://localhost:8000/docs**. Every endpoint can be tried in the browser.

Quick checks from PowerShell:

```powershell
# Health
Invoke-RestMethod http://localhost:8000/api/v1/health

# Analytics overview
Invoke-RestMethod http://localhost:8000/api/v1/analytics/overview

# All jobs with stats
Invoke-RestMethod http://localhost:8000/api/v1/jobs | Format-Table title, status, @{n='candidates';e={$_.stats.candidate_count}}

# Talent pool search
Invoke-RestMethod "http://localhost:8000/api/v1/candidates?q=langchain" | Format-Table name, job_title, status, final_score

# Invalid status override must be rejected with 422
Invoke-RestMethod -Method Patch -Uri http://localhost:8000/api/v1/matches/<MATCH_ID> -ContentType application/json -Body '{"status":"Hired"}'
```

## Automated tests

```powershell
python -m pytest                                   # 16 backend tests, ~30 s
cd frontend; npm run typecheck; npm run build      # type check + production build
```

---

## Reporting a problem

When something fails, note:

1. The step number from this guide.
2. What you expected vs. what happened (a screenshot helps).
3. The backend terminal output around that time. Every API line ends with a request ID like `[0f762cbb725c]`; that ID is also in the browser's response headers (`X-Request-ID`).
4. Any red errors in the browser console (F12 → Console).
