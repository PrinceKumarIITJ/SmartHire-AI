"use client";

import { EyeOff, ShieldAlert, ShieldCheck, Syringe, TextSearch } from "lucide-react";
import type { IntegrityReport, IntegrityRisk } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS = { hidden_text: EyeOff, prompt_injection: Syringe, keyword_stuffing: TextSearch };

export function IntegrityBadge({ risk, className }: { risk: IntegrityRisk; className?: string }) {
  if (risk === "low") return null;
  return (
    <span
      title={risk === "high" ? "Integrity guardrail: manipulation detected and removed" : "Integrity guardrail: suspicious content"}
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
        risk === "high" ? "bg-danger/10 text-danger ring-danger/25" : "bg-warning/10 text-warning ring-warning/25", className)}
    >
      <ShieldAlert className="h-3 w-3" /> {risk === "high" ? "Manipulation" : "Suspicious"}
    </span>
  );
}

/** Guardrail findings for a resume: hidden text, prompt injection, keyword stuffing. */
export function IntegrityPanel({ report }: { report: IntegrityReport | null }) {
  if (!report) return null;
  if (report.flags.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-success/25 bg-success/[0.05] px-5 py-3.5 text-sm text-ink">
        <ShieldCheck className="h-4 w-4 text-success" />
        Integrity check passed. No hidden text, prompt injection or keyword stuffing found.
      </div>
    );
  }
  const high = report.risk_level === "high";
  return (
    <div className={cn("rounded-2xl border p-5", high ? "border-danger/30 bg-danger/[0.05]" : "border-warning/30 bg-warning/[0.05]")}>
      <div className="flex items-start gap-3">
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", high ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning")}>
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">
            {high ? "This resume tried to manipulate the AI screener" : "Suspicious content detected"}
            <span className="ml-2 text-xs font-normal text-ink-muted">risk {report.risk_score}/100</span>
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            {report.sanitized
              ? `SmartHire removed ${report.removed_chars} characters of hidden or injected text before any agent read this resume, so the score reflects only legitimate content.`
              : "The content was kept, but review it before relying on the score."}
          </p>
          <ul className="mt-4 space-y-2.5">
            {report.flags.map((f, i) => {
              const Icon = ICONS[f.type] ?? ShieldAlert;
              return (
                <li key={i} className="rounded-xl border border-line bg-surface p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-ink">
                    <Icon className={cn("h-4 w-4", f.severity === "high" ? "text-danger" : f.severity === "medium" ? "text-warning" : "text-ink-subtle")} />
                    {f.title}
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-ink-subtle">{f.severity}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">{f.detail}</p>
                  <code className="mt-2 block break-words rounded-lg bg-canvas/70 px-2.5 py-1.5 font-mono text-[11px] text-ink">“{f.evidence}”</code>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
