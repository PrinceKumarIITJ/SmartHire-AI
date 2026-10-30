"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightLeft, BarChart3, Bot, Brain, Check, ChevronDown, FileSearch, GitCompareArrows, ListChecks, Loader2, Mail,
  MessagesSquare, Scale, Search, Send, ShieldCheck, Sparkles, Square, Trash2, User, Wrench, X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { CopilotEvent, CopilotProposal, Job } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Markdown } from "@/components/features/markdown";

const TOOL_META: Record<string, { label: string; icon: React.ElementType }> = {
  list_jobs: { label: "List jobs", icon: ListChecks },
  search_candidates: { label: "Search candidates", icon: Search },
  get_candidate_profile: { label: "Read candidate profile", icon: User },
  search_resume_evidence: { label: "Semantic search across resumes", icon: FileSearch },
  compare_candidates: { label: "Compare candidates", icon: GitCompareArrows },
  get_pipeline_analytics: { label: "Pipeline analytics", icon: BarChart3 },
  get_fairness_audit: { label: "Read fairness audit", icon: Scale },
  draft_interview_questions: { label: "Draft interview questions", icon: MessagesSquare },
  propose_status_change: { label: "Propose status change", icon: ArrowRightLeft },
  propose_send_email: { label: "Propose sending email", icon: Mail },
};

const SUGGESTIONS = [
  { icon: Sparkles, text: "Who are my top 3 candidates and why? Propose interviews for the best two." },
  { icon: FileSearch, text: "Which candidates have hands-on RAG or vector database experience? Quote the evidence." },
  { icon: Scale, text: "Is the current shortlist fair? Summarize the bias audit in plain English." },
  { icon: BarChart3, text: "What skill gaps are most common in my talent pool, and what should I change in the JD?" },
  { icon: ShieldCheck, text: "Did any resume try to manipulate the AI screener?" },
  { icon: MessagesSquare, text: "Prepare 5 interview questions for the highest-scoring candidate." },
];

interface Step {
  kind: "thinking" | "tool";
  id: string;
  text?: string;
  tool?: string;
  args?: Record<string, unknown>;
  summary?: string;
  output?: string;
  done?: boolean;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
  steps: Step[];
  proposals: (CopilotProposal & { state?: "pending" | "approved" | "rejected" | "working" })[];
  error?: string;
  streaming?: boolean;
}

function AgentTrace({ steps, streaming }: { steps: Step[]; streaming?: boolean }) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const toolCount = steps.filter((s) => s.kind === "tool").length;
  useEffect(() => { if (!streaming && toolCount > 2) setOpen(false); }, [streaming, toolCount]);
  if (!steps.length) return null;

  return (
    <div className="rounded-xl border border-line bg-elevated/30">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-xs text-ink-muted">
        {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-soft" /> : <Brain className="h-3.5 w-3.5 text-brand-soft" />}
        <span className="font-medium text-ink">{streaming ? "Working…" : "Agent trace"}</span>
        <span>· {toolCount} tool call{toolCount === 1 ? "" : "s"}</span>
        <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="relative ml-5 space-y-2 overflow-hidden border-l border-line pb-3 pl-4 pr-3">
            {steps.map((s) => {
              if (s.kind === "thinking") {
                return (
                  <li key={s.id} className="relative text-xs italic text-ink-muted">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-ink-subtle/50" />
                    {s.text}
                  </li>
                );
              }
              const meta = TOOL_META[s.tool ?? ""] ?? { label: s.tool, icon: Wrench };
              const Icon = meta.icon;
              const args = Object.entries(s.args ?? {}).filter(([, v]) => v !== "" && v !== null && v !== undefined);
              return (
                <motion.li key={s.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="relative">
                  <span className={cn("absolute -left-[23px] top-1.5 grid h-3 w-3 place-items-center rounded-full ring-2 ring-surface",
                    s.done ? "bg-success" : "bg-brand")}>
                    {!s.done && <span className="h-3 w-3 animate-ping rounded-full bg-brand/60" />}
                  </span>
                  <button onClick={() => setExpanded((e) => (e === s.id ? null : s.id))}
                    className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-elevated/60">
                    <Icon className="h-3.5 w-3.5 text-brand-soft" />
                    <span className="font-medium text-ink">{meta.label}</span>
                    {args.length > 0 && (
                      <code className="max-w-full truncate rounded bg-canvas/60 px-1.5 py-0.5 font-mono text-[10px] text-ink-subtle">
                        {args.map(([k, v]) => `${k}=${typeof v === "string" ? `"${v.length > 28 ? `${v.slice(0, 28)}…` : v}"` : JSON.stringify(v)}`).join(", ")}
                      </code>
                    )}
                    <span className="ml-auto text-ink-subtle">{s.done ? s.summary : "running…"}</span>
                  </button>
                  {expanded === s.id && s.output && (
                    <pre className="mt-1 max-h-56 overflow-auto rounded-lg border border-line bg-canvas/60 p-2.5 font-mono text-[10px] leading-relaxed text-ink-muted">
                      {(() => { try { return JSON.stringify(JSON.parse(s.output), null, 2); } catch { return s.output; } })()}
                    </pre>
                  )}
                </motion.li>
              );
            })}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProposalCard({ p, onDecide }: { p: Turn["proposals"][number]; onDecide: (approve: boolean) => void }) {
  const isEmail = p.kind === "send_email";
  const state = p.state ?? "pending";
  return (
    <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn("overflow-hidden rounded-xl border",
        state === "approved" ? "border-success/30 bg-success/[0.05]" : state === "rejected" ? "border-line opacity-60" : "border-warning/35 bg-warning/[0.05]")}>
      <div className="flex items-start gap-3 p-4">
        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", isEmail ? "bg-info/15 text-info" : "bg-brand/15 text-brand-soft")}>
          {isEmail ? <Mail className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">
              {isEmail ? `Send ${p.email_type} email to ${p.candidate_name}` : `Move ${p.candidate_name} → ${p.to_status}`}
            </span>
            <Badge tone={state === "approved" ? "success" : state === "rejected" ? "neutral" : "warning"}>
              {state === "approved" ? "Approved" : state === "rejected" ? "Dismissed" : "Needs your approval"}
            </Badge>
          </div>
          {isEmail ? (
            <div className="mt-2 rounded-lg border border-line bg-surface p-3 text-xs">
              <div className="text-ink-subtle">To: <span className="text-ink">{p.to}</span></div>
              <div className="mt-1 font-medium text-ink">{p.subject}</div>
              <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap text-ink-muted">{p.body_preview}</p>
            </div>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">
              <span className="text-ink-subtle">Currently {p.from_status}.</span> {p.reason}
            </p>
          )}
        </div>
      </div>
      {(state === "pending" || state === "working") && (
        <div className="flex justify-end gap-2 border-t border-line bg-surface/50 px-4 py-2.5">
          <Button variant="ghost" size="sm" onClick={() => onDecide(false)} disabled={state === "working"}><X className="h-3.5 w-3.5" /> Dismiss</Button>
          <Button size="sm" onClick={() => onDecide(true)} loading={state === "working"}>
            <Check className="h-3.5 w-3.5" /> {isEmail ? "Approve & send" : "Approve"}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default function CopilotPage() {
  const toast = useToast();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.jobs.list().then(setJobs).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    if (params.get("job")) setJobId(params.get("job")!);
    if (params.get("q")) setInput(params.get("q")!);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const patchLast = (fn: (t: Turn) => Turn) => setTurns((prev) => [...prev.slice(0, -1), fn(prev[prev.length - 1])]);

  const handleEvent = (e: CopilotEvent) => {
    patchLast((t) => {
      switch (e.type) {
        case "thinking":
          if (e.message === "Planning…") return t;
          return { ...t, steps: [...t.steps, { kind: "thinking", id: `th-${t.steps.length}`, text: e.message }] };
        case "tool_call":
          return { ...t, steps: [...t.steps, { kind: "tool", id: e.id, tool: e.tool, args: e.args }] };
        case "tool_result":
          return { ...t, steps: t.steps.map((s) => (s.id === e.id ? { ...s, done: true, summary: e.summary, output: e.output } : s)) };
        case "proposal":
          return { ...t, proposals: [...t.proposals, { ...e.proposal, state: "pending" }] };
        case "answer":
          return { ...t, content: e.content };
        case "error":
          return { ...t, error: e.message };
        case "done":
          return { ...t, streaming: false };
      }
    });
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    const history = [...turns, { role: "user" as const, content: q }]
      .filter((t) => t.content)
      .map((t) => ({ role: t.role, content: t.content }));
    setTurns((prev) => [...prev, { role: "user", content: q, steps: [], proposals: [] }, { role: "assistant", content: "", steps: [], proposals: [], streaming: true }]);
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await api.copilot.chat(history, jobId || undefined, handleEvent, controller.signal);
    } catch (err) {
      patchLast((t) => ({ ...t, error: err instanceof Error ? err.message : "Something went wrong." }));
    } finally {
      patchLast((t) => ({ ...t, streaming: false }));
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const decide = async (turnIdx: number, propIdx: number, approve: boolean) => {
    const p = turns[turnIdx].proposals[propIdx];
    const setState = (state: Turn["proposals"][number]["state"]) =>
      setTurns((prev) => prev.map((t, i) => (i !== turnIdx ? t : { ...t, proposals: t.proposals.map((x, j) => (j === propIdx ? { ...x, state } : x)) })));
    if (!approve) return setState("rejected");
    setState("working");
    try {
      if (p.kind === "status_change" && p.match_id && p.to_status) {
        await api.matches.update(p.match_id, { status: p.to_status });
        toast.success(`${p.candidate_name} moved to ${p.to_status}`);
      } else if (p.kind === "send_email" && p.draft_id) {
        const res = await api.emails.send(p.draft_id);
        toast.success("Email sent", res.message);
      }
      setState("approved");
    } catch (err) {
      setState("pending");
      toast.error("Couldn't apply action", err instanceof Error ? err.message : undefined);
    }
  };

  const empty = turns.length === 0;

  return (
    <div className="-my-8 flex h-[calc(100vh-64px)] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line py-4">
        <div className="relative">
          <span className="absolute inset-0 animate-pulse-ring rounded-xl bg-brand/30" />
          <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-lift"><Bot className="h-5 w-5" /></div>
        </div>
        <div className="mr-auto">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-ink">SmartHire Copilot <Badge tone="brand">Agentic</Badge></h1>
          <p className="text-xs text-ink-muted">Plans, calls tools over your live workspace, and proposes actions for your approval.</p>
        </div>
        <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="field h-9 w-auto max-w-[240px] py-0 text-xs" aria-label="Job scope">
          <option value="">Scope: all jobs</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>Scope: {j.title}</option>)}
        </select>
        {!empty && (
          <Button variant="ghost" size="sm" onClick={() => setTurns([])} disabled={busy}><Trash2 className="h-3.5 w-3.5" /> New chat</Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6">
        {empty ? (
          <div className="mx-auto flex max-w-3xl flex-col items-center pt-6 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
              <LogoMark size={64} animated />
            </motion.div>
            <h2 className="mt-6 text-2xl font-semibold text-ink md:text-3xl">What should we figure out today?</h2>
            <p className="mt-2 max-w-xl text-sm text-ink-muted">
              Ask in plain language. The Copilot decides which tools to use: searching candidates, semantic search across every resume,
              comparisons, fairness audits and analytics. It never changes anything without your approval.
            </p>
            <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <motion.button key={s.text} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => send(s.text)}
                  className="card card-hover flex items-start gap-3 p-4 text-left text-sm text-ink-muted hover:text-ink">
                  <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" /> {s.text}
                </motion.button>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-1.5">
              {Object.entries(TOOL_META).map(([k, m]) => (
                <span key={k} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-subtle">
                  <m.icon className="h-3 w-3" /> {m.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {turns.map((t, i) => t.role === "user" ? (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm text-brand-fg">{t.content}</div>
              </motion.div>
            ) : (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <LogoMark size={30} className="mt-0.5" />
                <div className="min-w-0 flex-1 space-y-3">
                  <AgentTrace steps={t.steps} streaming={t.streaming} />
                  {t.streaming && !t.steps.length && (
                    <div className="flex items-center gap-2 text-xs text-ink-subtle"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Planning…</div>
                  )}
                  {/* Some models emit raw citation markers like 【tool†1】; the trace above already shows sources. */}
                  {t.content && <Markdown>{t.content.replace(/【[^】]*】/g, "")}</Markdown>}
                  {t.proposals.map((p, j) => <ProposalCard key={j} p={p} onDecide={(ok) => decide(i, j, ok)} />)}
                  {t.error && <div className="rounded-xl border border-danger/25 bg-danger/[0.05] px-4 py-3 text-sm text-ink">{t.error}</div>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mx-auto w-full max-w-3xl pb-5">
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card focus-within:border-brand/60 focus-within:ring-4 focus-within:ring-brand/10">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask the Copilot… e.g. “Compare my top 3 for the AI role”"
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          {busy ? (
            <Button type="button" variant="secondary" size="icon" className="h-10 w-10" onClick={() => abortRef.current?.abort()} aria-label="Stop">
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button type="submit" size="icon" className="h-10 w-10" disabled={!input.trim()} aria-label="Send"><Send className="h-4 w-4" /></Button>
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-subtle">The Copilot can make mistakes. Actions are applied only after you approve them.</p>
      </form>
    </div>
  );
}
