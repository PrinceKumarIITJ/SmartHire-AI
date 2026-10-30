"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Activity, ArrowRight, Bot, BrainCircuit, ShieldAlert, CheckCircle2, FileSearch, FileText, GitCompareArrows, Mail,
  MessagesSquare, Scale, ShieldCheck, Sparkles, Upload, Users, Wand2, Zap,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/layout/theme";
import { ButtonLink } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] } }),
};

const AGENTS = [
  { name: "Integrity Guard", desc: "Blocks prompt injection", icon: ShieldAlert },
  { name: "JD Agent", desc: "Structures the role", icon: FileText },
  { name: "Resume Agent", desc: "Parses every profile", icon: FileSearch },
  { name: "Matching Agent", desc: "Hybrid XAI scoring", icon: BrainCircuit },
  { name: "Bias Audit", desc: "Blind re-scoring", icon: Scale },
  { name: "Report Agent", desc: "Executive summary", icon: Sparkles },
  { name: "Interview Agent", desc: "Tailored questions", icon: MessagesSquare },
  { name: "Email Agent", desc: "Human-approved drafts", icon: Mail },
  { name: "Copilot Agent", desc: "Plans & calls tools", icon: Bot },
];

const FEATURES = [
  {
    title: "An agentic Copilot that does the analysis for you",
    body: "Ask “who has production RAG experience, and who should I interview?”. The Copilot plans, chains tools (candidate search, semantic search across every resume, comparisons, fairness audits) and proposes actions you approve with one click.",
    icon: Bot, className: "md:col-span-2", visual: "copilot",
  },
  { title: "Guardrails against AI-gaming resumes", body: "Hidden white text, microscopic fonts and “ignore previous instructions” injections are detected and stripped before any agent reads the resume.", icon: ShieldAlert },
  { title: "LLMOps built in", body: "Every LLM call is traced (latency, tokens, fallbacks), and an evaluation harness measures ranking quality with NDCG@k and guardrail recall.", icon: Activity },
  {
    title: "Explainable scoring, not a black box",
    body: "Every rank decomposes into semantic fit, skills, experience, projects and education — with matched and missing skills spelled out.",
    icon: BrainCircuit, className: "md:col-span-2", visual: "scores",
  },
  { title: "Chat with any resume", body: "Ask questions in plain English. Answers are grounded in retrieved resume passages, with citations.", icon: MessagesSquare },
  { title: "Fairness audit built in", body: "Demographic-blind re-scoring and the four-fifths rule flag adverse impact before you act.", icon: ShieldCheck },
  { title: "Interview kits in one click", body: "Questions that verify claimed strengths and probe each gap — specific to the candidate.", icon: Wand2 },
  {
    title: "Human-in-the-loop outreach",
    body: "Personalized selection and rejection emails are drafted for you, but nothing sends until a recruiter approves it.",
    icon: Mail, className: "md:col-span-2", visual: "email",
  },
  { title: "Talent pool & side-by-side compare", body: "Search everyone you've ever screened and compare finalists head to head.", icon: GitCompareArrows },
];

function AuroraBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="grid-backdrop absolute inset-0" />
      <div className="absolute -top-40 left-[10%] h-[520px] w-[520px] animate-aurora rounded-full bg-[rgb(var(--aurora-a)/0.32)] blur-[110px]" />
      <div className="absolute -top-20 right-[5%] h-[440px] w-[440px] animate-aurora rounded-full bg-[rgb(var(--aurora-b)/0.22)] blur-[110px] [animation-delay:-6s]" />
      <div className="absolute top-[30%] left-[45%] h-[300px] w-[300px] animate-aurora rounded-full bg-[rgb(var(--aurora-c)/0.12)] blur-[100px] [animation-delay:-11s]" />
      <div className="noise absolute inset-0" />
    </div>
  );
}

function HeroPreview() {
  const rows = [
    { name: "Alex Rivera", role: "Senior ML Engineer · 6 yrs", score: 0.91, status: "Shortlisted", skills: ["Python", "LangChain", "FastAPI"] },
    { name: "Priya Natarajan", role: "AI Engineer · 4 yrs", score: 0.84, status: "Interview", skills: ["PyTorch", "RAG", "Docker"] },
    { name: "Sam Okafor", role: "Backend Engineer · 5 yrs", score: 0.68, status: "Pending", skills: ["Go", "Postgres"] },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 0.35, duration: 1, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformPerspective: 1400 }}
      className="relative mx-auto mt-16 w-full max-w-5xl"
    >
      <div className="absolute -inset-px rounded-[22px] bg-gradient-to-b from-brand/50 via-aqua/20 to-transparent opacity-70 blur-[1px]" />
      <div className="relative overflow-hidden rounded-[22px] border border-line bg-surface/90 shadow-[0_40px_120px_-30px_rgb(var(--brand)/0.45)] backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          <span className="ml-3 text-xs text-ink-subtle">Senior AI Engineer · Ranked shortlist</span>
          <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success sm:flex">
            <CheckCircle2 className="h-3 w-3" /> Fairness audit passed
          </span>
        </div>
        <div className="grid gap-0 md:grid-cols-[1fr_280px]">
          <div className="divide-y divide-line">
            {rows.map((r, i) => (
              <motion.div
                key={r.name}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.15, duration: 0.6 }}
                className="flex items-center gap-4 px-5 py-4"
              >
                <span className="w-5 text-center font-display text-sm text-ink-subtle">{i + 1}</span>
                <ScoreRing score={r.score} size={46} stroke={4} />
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-sm font-semibold text-ink">{r.name}</div>
                  <div className="text-xs text-ink-muted">{r.role}</div>
                </div>
                <div className="hidden gap-1.5 sm:flex">
                  {r.skills.map((s) => (
                    <span key={s} className="rounded-md bg-success/10 px-2 py-0.5 text-[11px] text-success ring-1 ring-inset ring-success/20">{s}</span>
                  ))}
                </div>
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                  r.status === "Shortlisted" && "bg-success/10 text-success ring-success/25",
                  r.status === "Interview" && "bg-brand/10 text-brand-soft ring-brand/25",
                  r.status === "Pending" && "bg-warning/10 text-warning ring-warning/25",
                )}>{r.status}</span>
              </motion.div>
            ))}
          </div>
          <div className="hidden border-l border-line p-5 text-left md:block">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Why #1?</div>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Strong skill alignment with 3 of 3 must-haves matched. Exceeds the experience target (6 yrs vs 4). High semantic similarity to the role.
            </p>
            <div className="mt-4 space-y-2.5">
              {[["Semantic", 0.89], ["Skills", 0.95], ["Experience", 1], ["Projects", 0.82]].map(([k, v], i) => (
                <div key={k as string}>
                  <div className="mb-1 flex justify-between text-[11px]"><span className="text-ink-muted">{k}</span><span className="tabular-nums text-ink">{Math.round((v as number) * 100)}</span></div>
                  <div className="h-1 overflow-hidden rounded-full bg-line">
                    <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${(v as number) * 100}%` }} transition={{ delay: 1.2 + i * 0.1, duration: 0.9 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AgentPipeline() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute left-[7%] right-[7%] top-[38px] hidden h-px overflow-hidden bg-line lg:block">
        <motion.div
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-brand to-transparent"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">
        {AGENTS.map((a, i) => (
          <motion.div
            key={a.name}
            variants={fadeUp}
            custom={i}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="relative flex flex-col items-center text-center"
          >
            <div className="group relative grid h-[76px] w-[76px] place-items-center rounded-2xl border border-line bg-surface shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-glow">
              <motion.span
                className="absolute inset-0 rounded-2xl bg-brand/20"
                animate={{ opacity: [0, 0.9, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
              />
              <a.icon className="relative h-7 w-7 text-brand-soft" />
            </div>
            <div className="mt-3 text-sm font-semibold text-ink">{a.name}</div>
            <div className="text-xs text-ink-muted">{a.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FeatureVisual({ kind }: { kind?: string }) {
  if (kind === "scores") {
    return (
      <div className="mt-6 flex items-end gap-3">
        {[0.92, 0.78, 0.86, 0.64, 0.95].map((v, i) => (
          <motion.div key={i} className="flex-1 rounded-t-md rounded-b-sm bg-gradient-to-t from-brand/60 to-aqua/70"
            initial={{ height: 0 }} whileInView={{ height: v * 96 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
        ))}
      </div>
    );
  }
  if (kind === "copilot") {
    const steps = [["Search candidates", "skill = RAG"], ["Semantic search across resumes", "6 passages"], ["Compare candidates", "3 finalists"], ["Propose status change", "awaiting approval"]];
    return (
      <div className="mt-6 space-y-2 rounded-xl border border-line bg-canvas/60 p-4 font-mono text-[11px]">
        {steps.map(([a, b], i) => (
          <motion.div key={a} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.25 }}
            className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", i === steps.length - 1 ? "bg-warning" : "bg-success")} />
            <span className="text-ink">{a}</span><span className="ml-auto text-ink-subtle">{b}</span>
          </motion.div>
        ))}
      </div>
    );
  }
  if (kind === "email") {
    return (
      <div className="mt-6 rounded-xl border border-line bg-canvas/60 p-4 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-medium text-ink">Next steps — Senior AI Engineer</span>
          <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning ring-1 ring-inset ring-warning/25">Awaiting approval</span>
        </div>
        <p className="mt-2 leading-relaxed text-ink-muted">Hi Priya — your work shipping a production RAG system with PyTorch stood out to our team…</p>
        <div className="mt-3 flex gap-2">
          <span className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-medium text-white">Approve & send</span>
          <span className="rounded-lg border border-line px-3 py-1.5 text-[11px] text-ink-muted">Edit</span>
        </div>
      </div>
    );
  }
  return null;
}

export function Landing() {
  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 80], ["rgb(var(--canvas) / 0)", "rgb(var(--canvas) / 0.8)"]);
  const navBorder = useTransform(scrollY, [0, 80], ["rgb(var(--line) / 0)", "rgb(var(--line) / 1)"]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <motion.header style={{ backgroundColor: navBg, borderColor: navBorder }} className="fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <Link href="/" aria-label="SmartHire home"><Logo size={32} /></Link>
          <nav className="hidden items-center gap-8 text-sm text-ink-muted md:flex">
            <a href="#agents" className="transition-colors hover:text-ink">Agents</a>
            <a href="#features" className="transition-colors hover:text-ink">Features</a>
            <a href="#how" className="transition-colors hover:text-ink">How it works</a>
            <a href="#responsible" className="transition-colors hover:text-ink">Responsible AI</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ButtonLink href="/dashboard" size="sm" className="h-9 px-4">
              Open workspace <ArrowRight className="h-3.5 w-3.5" />
            </ButtonLink>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative px-4 pb-24 pt-36 text-center md:px-8 md:pt-44">
        <AuroraBackdrop />
        <div className="relative mx-auto max-w-4xl">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-xs font-medium text-brand-soft">
            <Zap className="h-3.5 w-3.5" /> Agentic AI recruiting · LangGraph multi-agent + tool-calling Copilot
          </motion.div>
          <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="mt-6 text-balance text-[42px] font-semibold leading-[1.05] text-ink sm:text-6xl md:text-7xl">
            Hire the right people.
            <br />
            <span className="text-gradient">Know exactly why.</span>
          </motion.h1>
          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="mx-auto mt-6 max-w-2xl text-balance text-base text-ink-muted md:text-lg">
            SmartHire reads every resume, ranks candidates with transparent, explainable scores, audits the shortlist for bias, and drafts
            your outreach — so recruiters spend their time on people, not paperwork.
          </motion.p>
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/jobs?new=1" size="lg" className="w-full sm:w-auto">
              Screen your first role <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/dashboard" size="lg" variant="secondary" className="w-full sm:w-auto">
              View dashboard
            </ButtonLink>
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink-subtle">
            {["Tool-calling Copilot", "Prompt-injection guardrails", "Explainable AI", "Fairness audit", "LLM tracing & evals"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" />{t}</span>
            ))}
          </motion.div>
        </div>
        <HeroPreview />
      </section>

      {/* Tech strip */}
      <section className="border-y border-line bg-surface/40 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-4 text-sm font-medium text-ink-subtle">
          <span className="text-xs uppercase tracking-[0.2em]">Built on</span>
          {["LangGraph", "Gemini 2.5 Flash", "Groq Llama 3.3", "FAISS", "Sentence-Transformers", "FastAPI", "Next.js"].map((t) => (
            <span key={t} className="font-display transition-colors hover:text-ink">{t}</span>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="mx-auto max-w-7xl px-4 py-28 md:px-8">
        <SectionHeading eyebrow="The agent team" title="A recruiting team that never sleeps" body="Each agent owns one job and hands structured output to the next. The result is a pipeline you can inspect at every step." />
        <div className="mt-16"><AgentPipeline /></div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 pb-28 md:px-8">
        <SectionHeading eyebrow="Features" title="Everything between “we're hiring” and “welcome aboard”" />
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              custom={i % 3}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className={cn("card card-hover group relative overflow-hidden p-7", f.className)}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100 md:opacity-0" />
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand-soft ring-1 ring-inset ring-brand/20">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.body}</p>
              <FeatureVisual kind={f.visual} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative border-y border-line bg-surface/40 py-28">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <SectionHeading eyebrow="How it works" title="From job post to shortlist in minutes" />
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              { icon: FileText, title: "Describe the role", body: "Paste a job description. The JD Agent extracts must-have skills, experience and education into a structured profile." },
              { icon: Upload, title: "Drop in resumes", body: "Upload PDFs, DOCX or text in bulk. Every resume is parsed, embedded and indexed for retrieval." },
              { icon: Users, title: "Review, decide, reach out", body: "Work the ranked shortlist, compare finalists, generate interview kits and approve outreach emails." },
            ].map((s, i) => (
              <motion.div key={s.title} variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }} className="relative">
                <div className="font-display text-6xl font-semibold text-ink/[0.06]">0{i + 1}</div>
                <div className="-mt-6 grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-white shadow-lift"><s.icon className="h-5 w-5" /></div>
                <h3 className="mt-5 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Responsible AI */}
      <section id="responsible" className="mx-auto max-w-6xl px-4 py-28 md:px-8">
        <div className="card relative overflow-hidden p-8 md:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-success/10 blur-3xl" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success ring-1 ring-inset ring-success/25">
                <ShieldCheck className="h-3.5 w-3.5" /> Responsible AI
              </div>
              <h2 className="mt-5 text-3xl font-semibold text-ink md:text-4xl">AI that assists, people who decide.</h2>
              <p className="mt-4 text-ink-muted">
                SmartHire re-scores every candidate with names, contact details, pronouns and institutions redacted, then compares selection
                rates using the four-fifths rule. AI recommendations are always overridable, and no email leaves without recruiter approval.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                "Demographic-blind re-scoring on every run",
                "Disparate-impact ratio with clear pass / alert",
                "Recruiter overrides and private notes",
                "Grounded, cited answers in resume chat",
                "Protected characteristics never used in questions",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 rounded-xl border border-line bg-canvas/50 px-4 py-3 text-sm text-ink">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 md:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-brand-gradient px-8 py-16 text-center text-white md:py-20">
          <div className="grid-backdrop absolute inset-0 opacity-30" />
          <div className="relative">
            <LogoMark size={56} className="mx-auto" animated />
            <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-semibold md:text-5xl">Your next great hire is already in the pile.</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">Create a role, drop in resumes, and let the agents surface them.</p>
            <Link href="/jobs?new=1" className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-[#3b25c4] shadow-xl transition-transform hover:-translate-y-0.5">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-ink-subtle md:flex-row md:px-8">
          <Logo size={26} />
          <span>Recommendations are decision support. Final hiring decisions rest with your team.</span>
          <span>© {new Date().getFullYear()} SmartHire</span>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="mx-auto max-w-3xl text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-soft">{eyebrow}</div>
      <h2 className="mt-4 text-balance text-3xl font-semibold text-ink md:text-5xl">{title}</h2>
      {body && <p className="mt-4 text-balance text-ink-muted md:text-lg">{body}</p>}
    </motion.div>
  );
}
