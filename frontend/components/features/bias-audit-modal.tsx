"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw, Scale, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/primitives";
import { BlindScoreDotPlot } from "@/components/charts/charts";

export function BiasAuditModal({ jobId, open, onClose }: { jobId: string; open: boolean; onClose: () => void }) {
  const [refreshing, setRefreshing] = useState(false);
  const audit = useQuery(() => (open ? api.audit.get(jobId) : Promise.resolve(undefined)), [jobId, open]);

  const rerun = async () => {
    setRefreshing(true);
    try { audit.setData(await api.audit.get(jobId, true)); } finally { setRefreshing(false); }
  };

  const data = audit.data;
  const s = data?.disparate_impact_summary ?? {};
  const flagged = !!s.disparate_impact_detected;
  const ratio = s.disparate_impact_ratio ?? 1;
  const rows = Object.entries(data?.blind_scores ?? {}).map(([name, v]: [string, { standard_score: number; blind_score: number }]) => ({ name, standard: v.standard_score, blind: v.blind_score }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<Scale className="h-5 w-5" />}
      title="Fairness audit"
      subtitle="Demographic-blind re-scoring and the four-fifths (80%) disparate-impact rule"
      footer={
        <>
          <Button variant="ghost" onClick={rerun} loading={refreshing}><RefreshCw className="h-3.5 w-3.5" /> Re-run audit</Button>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      {audit.error ? (
        <ErrorState message={audit.error} onRetry={audit.refetch} />
      ) : !data ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-48" /></div>
      ) : (
        <div className="space-y-6">
          <div className={cn("flex items-start gap-4 rounded-2xl border p-5", flagged ? "border-danger/30 bg-danger/[0.06]" : "border-success/30 bg-success/[0.06]")}>
            <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", flagged ? "bg-danger/15 text-danger" : "bg-success/15 text-success")}>
              {flagged ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-ink">{flagged ? "Potential adverse impact detected" : "No adverse impact detected"}</h3>
              <p className="mt-1 text-sm text-ink-muted">{s.summary}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line p-4">
              <div className="text-xs text-ink-muted">Impact ratio</div>
              <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{ratio.toFixed(2)}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div className={cn("h-full rounded-full", flagged ? "bg-danger" : "bg-success")} style={{ width: `${Math.min(100, (ratio / 1.25) * 100)}%` }} />
              </div>
              <div className="mt-1.5 text-[11px] text-ink-subtle">Passes between 0.80 and 1.25</div>
            </div>
            <div className="rounded-xl border border-line p-4">
              <div className="text-xs text-ink-muted">Standard shortlist</div>
              <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
                {s.standard_shortlisted ?? 0}<span className="text-base text-ink-subtle">/{s.total_candidates ?? 0}</span>
              </div>
              <div className="mt-1 text-[11px] text-ink-subtle">{Math.round((s.standard_selection_rate ?? 0) * 100)}% selection rate</div>
            </div>
            <div className="rounded-xl border border-line p-4">
              <div className="text-xs text-ink-muted">Blind shortlist</div>
              <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
                {s.blind_shortlisted ?? 0}<span className="text-base text-ink-subtle">/{s.total_candidates ?? 0}</span>
              </div>
              <div className="mt-1 text-[11px] text-ink-subtle">{Math.round((s.blind_selection_rate ?? 0) * 100)}% selection rate</div>
            </div>
          </div>

          {rows.length > 0 && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-ink">Score shift when identity is redacted</h4>
              <p className="mb-4 text-xs text-ink-muted">Names, contact details, pronouns and institutions are removed before re-scoring. Large gaps deserve a closer look.</p>
              <BlindScoreDotPlot data={rows} />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
