"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, Check, FileSearch, FileText, Loader2, Mail, Save, Scale, Sparkles, Upload, XCircle } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import type { RunEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "upload", label: "Upload, text extraction & integrity scan", icon: Upload },
  { key: "jd", label: "JD Agent · structuring requirements", icon: FileText },
  { key: "resume", label: "Resume Agent · parsing profiles", icon: FileSearch },
  { key: "match", label: "Matching Agent · embeddings + XAI scoring", icon: BrainCircuit },
  { key: "audit", label: "Bias Audit · demographic-blind re-score", icon: Scale },
  { key: "report", label: "Report Agent · executive summary", icon: Sparkles },
  { key: "email", label: "Email Agent · drafting outreach", icon: Mail },
  { key: "persist", label: "Saving results", icon: Save },
];

export interface LiveRun {
  phase: "uploading" | "running" | "completed" | "failed";
  stage: string;
  total: number;
  progress: Record<string, { done: number; total: number }>;
  log: RunEvent[];
  error?: string | null;
}

/** Live view of the LangGraph pipeline, driven by real Server-Sent Events from the backend. */
export function PipelineProgress({ run }: { run: LiveRun }) {
  const current = run.phase === "uploading" ? 0 : run.phase === "completed" ? STAGES.length : Math.max(1, STAGES.findIndex((s) => s.key === run.stage));
  const within = run.progress[run.stage];
  const pctDone = run.phase === "completed" ? 100
    : Math.round(((current + (within && within.total ? within.done / within.total : 0)) / STAGES.length) * 100);
  const failed = run.phase === "failed";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <div className="relative">
          {!failed && run.phase !== "completed" && <span className="absolute inset-0 animate-pulse-ring rounded-xl bg-brand/40" />}
          <LogoMark size={44} animated={run.phase === "running" || run.phase === "uploading"} />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-ink">
            {failed ? "Pipeline failed" : run.phase === "completed" ? "Pipeline complete" : "Agents at work"}
          </h3>
          <p className="text-xs text-ink-muted">
            {failed ? run.error : run.phase === "completed" ? "Opening your ranked shortlist…"
              : `Screening ${run.total} candidate${run.total === 1 ? "" : "s"} · live from the agent graph`}
          </p>
        </div>
        <span className="font-display text-2xl font-semibold tabular-nums text-ink">{pctDone}%</span>
      </div>
      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-line">
        <motion.div className={cn("h-full rounded-full", failed ? "bg-danger" : "bg-brand-gradient")} animate={{ width: `${pctDone}%` }} transition={{ duration: 0.5 }} />
      </div>

      <div className="relative mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <ol className="space-y-2">
          {STAGES.map((s, i) => {
            const state = i < current ? "done" : i === current ? (failed ? "failed" : run.phase === "completed" ? "done" : "active") : "todo";
            const p = run.progress[s.key];
            return (
              <li key={s.key} className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs transition-all duration-500",
                state === "done" && "border-success/25 bg-success/[0.06] text-ink",
                state === "active" && "border-brand/40 bg-brand/10 text-ink shadow-glow",
                state === "failed" && "border-danger/40 bg-danger/10 text-ink",
                state === "todo" && "border-line text-ink-subtle"
              )}>
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                  state === "done" ? "bg-success/15 text-success" : state === "active" ? "bg-brand/20 text-brand-soft" : state === "failed" ? "bg-danger/15 text-danger" : "bg-elevated")}>
                  {state === "done" ? <Check className="h-3.5 w-3.5" /> : state === "active" ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : state === "failed" ? <XCircle className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
                </span>
                <span className="flex-1">{s.label}</span>
                {p && p.total > 0 && <span className="tabular-nums text-ink-muted">{p.done}/{p.total}</span>}
              </li>
            );
          })}
        </ol>

        <div className="flex min-h-[240px] flex-col rounded-xl border border-line bg-canvas/60">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-[11px] font-medium text-ink-muted">
            <span className={cn("h-1.5 w-1.5 rounded-full", run.phase === "running" ? "animate-pulse bg-success" : "bg-ink-subtle")} />
            Live agent log
          </div>
          <ol className="flex max-h-[330px] flex-1 flex-col-reverse overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
            <AnimatePresence initial={false}>
              {[...run.log].reverse().map((e, i) => (
                <motion.li key={`${run.log.length - i}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("flex gap-2", e.type === "failed" ? "text-danger" : e.type === "stage" ? "text-brand-soft" : "text-ink-muted")}>
                  <span className="shrink-0 tabular-nums text-ink-subtle">{(e.ts ?? 0).toFixed(1)}s</span>
                  <span>{e.type === "stage" ? `▸ ${e.label}` : e.type === "completed" ? `✓ Done — ${e.processed} candidates` : e.message ?? e.error ?? e.type}</span>
                </motion.li>
              ))}
            </AnimatePresence>
            {run.log.length === 0 && <li className="text-ink-subtle">Waiting for the first event…</li>}
          </ol>
        </div>
      </div>
    </motion.div>
  );
}
