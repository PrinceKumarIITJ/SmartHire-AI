"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Copy, Lightbulb, Printer, RefreshCw, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

export function ExecutiveReportModal({ jobId, jobTitle, open, onClose }: { jobId: string; jobTitle: string; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const report = useQuery(() => (open ? api.reports.get(jobId) : Promise.resolve(undefined)), [jobId, open]);
  const r = report.data;

  const regenerate = async () => {
    setRefreshing(true);
    try {
      report.setData(await api.reports.get(jobId, true));
      toast.success("Report regenerated");
    } catch (e) {
      toast.error("Couldn't regenerate", e instanceof Error ? e.message : undefined);
    } finally {
      setRefreshing(false);
    }
  };

  const asText = () =>
    r ? [
      `Executive Hiring Report — ${jobTitle}`, "", r.summary_text, "",
      "Strengths:", ...r.key_strengths.map((s) => `• ${s}`), "",
      "Skill gaps:", ...r.skill_gaps.map((s) => `• ${s}`), "",
      "Recommendations:", ...r.hiring_recommendations.map((s, i) => `${i + 1}. ${s}`),
    ].join("\n") : "";

  const copy = async () => {
    try { await navigator.clipboard.writeText(asText()); toast.success("Report copied to clipboard"); }
    catch { toast.error("Clipboard unavailable"); }
  };

  const print = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(`<pre style="font:14px/1.6 system-ui;white-space:pre-wrap;padding:32px">${asText().replace(/</g, "&lt;")}</pre>`);
    w.document.close();
    w.print();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<Sparkles className="h-5 w-5" />}
      title="Executive hiring report"
      subtitle={r ? `${jobTitle} · generated ${formatDate(r.created_at)}` : jobTitle}
      footer={
        <>
          <Button variant="ghost" onClick={regenerate} loading={refreshing}><RefreshCw className="h-3.5 w-3.5" /> Regenerate</Button>
          <Button variant="secondary" onClick={copy} disabled={!r}><Copy className="h-3.5 w-3.5" /> Copy</Button>
          <Button variant="secondary" onClick={print} disabled={!r}><Printer className="h-3.5 w-3.5" /> Print</Button>
        </>
      }
    >
      {report.error ? (
        <ErrorState message={report.error} onRetry={report.refetch} />
      ) : !r ? (
        <div className="space-y-3"><Skeleton className="h-28" /><div className="grid grid-cols-2 gap-3"><Skeleton className="h-36" /><Skeleton className="h-36" /></div></div>
      ) : (
        <div className="space-y-5">
          <p className="rounded-2xl border border-line bg-elevated/40 p-5 text-[15px] leading-relaxed text-ink">{r.summary_text}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Section icon={<CheckCircle2 className="h-4 w-4 text-success" />} title="Talent pool strengths" items={r.key_strengths} />
            <Section icon={<AlertCircle className="h-4 w-4 text-warning" />} title="Common skill gaps" items={r.skill_gaps} />
          </div>
          <div className="rounded-2xl border border-brand/25 bg-brand/[0.05] p-5">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Lightbulb className="h-4 w-4 text-brand-soft" /> Recommendations</h4>
            <ol className="space-y-2.5">
              {r.hiring_recommendations.map((rec, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand/15 text-[11px] font-semibold text-brand-soft">{i + 1}</span>
                  {rec}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-line p-5">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">{icon}{title}</h4>
      {items.length === 0 ? <p className="text-sm text-ink-subtle">None identified.</p> : (
        <ul className="space-y-2">
          {items.map((it, i) => <li key={i} className="flex gap-2 text-sm text-ink-muted"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-subtle" />{it}</li>)}
        </ul>
      )}
    </div>
  );
}
