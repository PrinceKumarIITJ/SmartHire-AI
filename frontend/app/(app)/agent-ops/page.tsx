"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, CheckCircle2, Coins, FlaskConical, Gauge, Loader2, Play, RefreshCw, Timer, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { EvalRun, OpsGroup } from "@/lib/types";
import { useQuery } from "@/lib/hooks";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Segmented, Skeleton } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { ColumnChart, TableToggle } from "@/components/charts/charts";

const WINDOWS = [{ value: "24", label: "24h" }, { value: "168", label: "7d" }, { value: "720", label: "30d" }] as const;

const METRIC_LABELS: { key: string; label: string; hint: string; pct?: boolean }[] = [
  { key: "ndcg_at_3", label: "NDCG@3", hint: "Ranking quality of the top 3 vs. human grades", pct: true },
  { key: "pairwise_accuracy", label: "Pairwise accuracy", hint: "Candidate pairs ordered correctly", pct: true },
  { key: "precision_at_k", label: "Precision@k", hint: "Good candidates in the top k", pct: true },
  { key: "shortlist_decision_accuracy", label: "Shortlist accuracy", hint: "Shortlist / reject decisions vs. labels", pct: true },
  { key: "skill_extraction_recall", label: "Skill extraction recall", hint: "Key skills found by the Resume Agent", pct: true },
  { key: "guardrail_recall", label: "Guardrail recall", hint: "Manipulation attempts caught", pct: true },
  { key: "guardrail_precision", label: "Guardrail precision", hint: "Flags that were real attacks", pct: true },
  { key: "spearman", label: "Spearman ρ", hint: "Rank correlation, score vs. grade" },
];

function LatencyTable({ rows, title, subtitle }: { rows: OpsGroup[]; title: string; subtitle: string }) {
  const maxP95 = Math.max(1, ...rows.map((r) => r.p95_ms));
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="overflow-x-auto p-2">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-ink-subtle">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 text-right font-medium">Calls</th>
              <th className="px-3 py-2 font-medium">Latency p50 / p95</th>
              <th className="px-3 py-2 text-right font-medium">Errors</th>
              <th className="px-3 py-2 text-right font-medium">Tokens</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="px-3 py-2.5 font-mono text-xs text-ink">{r.name}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink">{r.calls}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="relative h-1.5 w-28 overflow-hidden rounded-full bg-line">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-brand/40" style={{ width: `${(r.p95_ms / maxP95) * 100}%` }} />
                      <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${(r.p50_ms / maxP95) * 100}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-ink-muted">{(r.p50_ms / 1000).toFixed(1)}s / {(r.p95_ms / 1000).toFixed(1)}s</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className={cn("text-xs tabular-nums", r.errors ? "text-danger" : "text-ink-subtle")}>
                    {r.errors} <span className="text-ink-subtle">({Math.round(r.error_rate * 100)}%)</span>
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-xs tabular-nums text-ink-muted">{(r.input_tokens + r.output_tokens).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function EvalPanel() {
  const toast = useToast();
  const evals = useQuery(() => api.ops.evals(), []);
  const [starting, setStarting] = useState(false);
  const running = evals.data?.some((e) => e.status === "running");

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => evals.refetch(), 4000);
    return () => clearInterval(t);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    setStarting(true);
    try {
      await api.ops.runEval();
      toast.info("Evaluation started", "Running the golden set through the real agents. This takes about a minute.");
      evals.refetch();
    } catch (e) {
      toast.error("Couldn't start evaluation", e instanceof Error ? e.message : undefined);
    } finally {
      setStarting(false);
    }
  };

  const latest: EvalRun | undefined = evals.data?.find((e) => e.status === "completed");
  const m = latest?.metrics ?? {};

  return (
    <Card>
      <CardHeader
        icon={<FlaskConical className="h-4 w-4" />}
        title="Evaluation harness"
        subtitle="Golden set of graded resumes and adversarial inputs, run through the real agents"
        action={<Button size="sm" onClick={start} loading={starting} disabled={running}>
          {running ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running…</> : <><Play className="h-3.5 w-3.5" /> Run evaluation</>}
        </Button>}
      />
      <div className="p-5">
        {evals.error ? <ErrorState message={evals.error} onRetry={evals.refetch} /> : !evals.data ? <Skeleton className="h-40" /> : !latest ? (
          <EmptyState icon={<FlaskConical className="h-6 w-6" />} title="No evaluation yet"
            description="Run the harness to measure ranking quality (NDCG, precision@k), extraction recall and guardrail accuracy." />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {METRIC_LABELS.map((x, i) => {
                const v = Number(m[x.key] ?? 0);
                const good = x.key === "spearman" ? v >= 0.7 : v >= 0.8;
                return (
                  <motion.div key={x.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="rounded-xl border border-line p-4" title={x.hint}>
                    <div className="flex items-center justify-between text-[11px] text-ink-muted">
                      {x.label}
                      {good ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                    </div>
                    <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
                      {x.pct ? `${Math.round(v * 100)}%` : v.toFixed(2)}
                    </div>
                    <div className="mt-1 text-[10px] leading-snug text-ink-subtle">{x.hint}</div>
                  </motion.div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-muted">
              <span>{String(m.golden_resumes)} golden resumes · {String(m.guardrail_cases)} guardrail cases</span>
              <span>{String(m.llm_calls)} LLM calls · {Number(m.total_tokens).toLocaleString()} tokens</span>
              <span>avg LLM latency {(Number(m.avg_llm_latency_ms) / 1000).toFixed(1)}s · total {String(m.duration_s)}s</span>
              <span>Hidden-text attack sanitized: {m.hidden_text_sanitized ? "yes" : "no"}</span>
            </div>
            {latest.details.ranking && (
              <TableToggle
                headers={["Candidate", "Human grade (0-3)", "Model score", "Decision", "Skill recall"]}
                rows={latest.details.ranking.map((r) => [r.name, r.grade, Math.round(r.score * 100), r.status, `${Math.round(r.skill_recall * 100)}%`])}
              />
            )}
          </div>
        )}
        {evals.data && evals.data.length > 0 && (
          <div className="mt-6 border-t border-line pt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">History</div>
            <ul className="space-y-1.5 text-xs">
              {evals.data.slice(0, 6).map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  {e.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : e.status === "failed" ? <XCircle className="h-3.5 w-3.5 text-danger" /> : <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-soft" />}
                  <span className="text-ink-muted">{timeAgo(e.created_at)}</span>
                  {e.status === "completed" && <span className="tabular-nums text-ink">NDCG@3 {Math.round(Number(e.metrics.ndcg_at_3) * 100)}% · guardrail recall {Math.round(Number(e.metrics.guardrail_recall) * 100)}%</span>}
                  {e.status === "failed" && <span className="truncate text-danger">{e.error}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function AgentOpsPage() {
  const [hours, setHours] = useState<"24" | "168" | "720">("168");
  const overview = useQuery(() => api.ops.overview(Number(hours)), [hours]);
  const traces = useQuery(() => api.ops.traces(40), []);
  const o = overview.data;

  return (
    <>
      <PageHeader
        title="Agent Ops"
        description="Observability for every LLM call your agents make: latency, reliability, token usage and evaluation quality."
        actions={
          <>
            <Segmented value={hours} onChange={setHours} options={WINDOWS.map((w) => ({ value: w.value, label: w.label }))} />
            <Button variant="secondary" size="sm" className="h-9" onClick={() => { overview.refetch(); traces.refetch(); }}><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          </>
        }
      />

      {overview.error ? <ErrorState message={overview.error} onRetry={overview.refetch} /> : !o ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[124px] rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard index={0} label="LLM calls" value={o.total_calls} icon={<Activity className="h-4 w-4" />} hint={`last ${WINDOWS.find((w) => w.value === hours)?.label}`} />
            <StatCard index={1} label="p95 latency (s)" value={o.p95_ms / 1000} decimals={1} icon={<Timer className="h-4 w-4" />} accent="aqua" hint={`p50 ${(o.p50_ms / 1000).toFixed(1)}s`} />
            <StatCard index={2} label="Error / fallback rate" value={o.error_rate * 100} decimals={1} suffix="%" icon={<Gauge className="h-4 w-4" />}
              accent={o.error_rate > 0.1 ? "warning" : "success"} hint={`${o.errors} failed calls, retried via fallback`} />
            <StatCard index={3} label="Tokens" value={o.input_tokens + o.output_tokens} icon={<Coins className="h-4 w-4" />} accent="warning"
              hint={`${o.input_tokens.toLocaleString()} in · ${o.output_tokens.toLocaleString()} out`} />
          </div>

          {o.total_calls === 0 ? (
            <EmptyState icon={<Activity className="h-6 w-6" />} title="No LLM calls recorded yet"
              description="Create a job, run the pipeline or chat with the Copilot. Every call is traced here automatically." />
          ) : (
            <>
              <Card>
                <CardHeader title="Call volume" subtitle="LLM calls per hour" />
                <div className="px-5 pb-5 pt-6">
                  <ColumnChart data={o.timeline.slice(-24).map((t) => ({ label: t.hour.slice(11, 13) + "h", count: t.calls }))} height={140} valueLabel="Calls" />
                </div>
              </Card>
              <div className="grid gap-6 xl:grid-cols-2">
                <LatencyTable rows={o.by_agent} title="By agent" subtitle="Which agent is slow or failing" />
                <LatencyTable rows={o.by_model} title="By model" subtitle="Primary vs. fallback provider" />
              </div>
            </>
          )}

          <EvalPanel />

          <Card>
            <CardHeader title="Recent traces" subtitle="Latest individual LLM calls" />
            <div className="overflow-x-auto p-2">
              {!traces.data ? <Skeleton className="m-3 h-40" /> : (
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wider text-ink-subtle">
                    <tr>
                      <th className="px-3 py-2 font-medium">When</th><th className="px-3 py-2 font-medium">Agent</th>
                      <th className="px-3 py-2 font-medium">Model</th><th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Latency</th><th className="px-3 py-2 text-right font-medium">Tokens in / out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {traces.data.map((t) => (
                      <tr key={t.id} title={t.error || undefined}>
                        <td className="px-3 py-2 text-ink-subtle">{timeAgo(t.created_at)}</td>
                        <td className="px-3 py-2 font-mono text-ink">{t.agent}</td>
                        <td className="px-3 py-2 text-ink-muted">{t.provider} · {t.model}</td>
                        <td className="px-3 py-2">{t.status === "ok" ? <Badge tone="success" dot>ok</Badge> : <Badge tone="danger" dot>error</Badge>}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink">{(t.latency_ms / 1000).toFixed(2)}s</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink-muted">{t.input_tokens} / {t.output_tokens}</td>
                      </tr>
                    ))}
                    {traces.data.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-ink-subtle">No traces yet.</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
