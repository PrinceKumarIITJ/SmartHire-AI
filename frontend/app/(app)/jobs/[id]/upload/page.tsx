"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckCircle2, FileText, GraduationCap, Play, RefreshCw, Trash2, UploadCloud, X } from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { cn, pct, STATUS_TONE } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Card, CardHeader, ErrorState, PageHeader, SkillChip, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { PipelineProgress, type LiveRun } from "@/components/features/pipeline-progress";
import type { RunEvent } from "@/lib/types";

const ACCEPTED = [".pdf", ".docx", ".txt"];
const MAX_MB = 10;

function formatBytes(b: number) {
  return b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const job = useQuery(() => api.jobs.get(id), [id]);
  const existing = useQuery(() => api.jobs.candidates(id), [id]);

  const [files, setFiles] = useState<File[]>([]);
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([]);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "running" | "done">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const addFiles = useCallback((list: FileList | File[]) => {
    const next: File[] = [];
    const bad: { name: string; reason: string }[] = [];
    Array.from(list).forEach((f) => {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPTED.includes(ext)) bad.push({ name: f.name, reason: "Unsupported type" });
      else if (f.size > MAX_MB * 1024 * 1024) bad.push({ name: f.name, reason: `Over ${MAX_MB} MB` });
      else next.push(f);
    });
    setFiles((prev) => {
      const seen = new Set(prev.map((p) => `${p.name}-${p.size}`));
      return [...prev, ...next.filter((f) => !seen.has(`${f.name}-${f.size}`))];
    });
    setRejected(bad);
  }, []);

  const busy = phase === "uploading" || phase === "running";
  const existingCount = existing.data?.length ?? 0;
  const unprocessed = (existing.data ?? []).filter((c) => c.status === "Unprocessed").length;
  const [live, setLive] = useState<LiveRun | null>(null);
  const unsubscribe = useRef<(() => void) | null>(null);

  const applyEvent = useCallback((e: RunEvent) => {
    setLive((prev) => {
      const r: LiveRun = prev ?? { phase: "running", stage: "jd", total: 0, progress: {}, log: [] };
      const next: LiveRun = { ...r, log: [...r.log, e].slice(-120) };
      if (e.type === "start") next.total = e.total ?? r.total;
      if (e.type === "stage" && e.stage) next.stage = e.stage;
      if (e.type === "progress" && e.stage) next.progress = { ...r.progress, [e.stage]: { done: e.done ?? 0, total: e.total ?? 0 } };
      if (e.type === "completed") next.phase = "completed";
      if (e.type === "failed") { next.phase = "failed"; next.error = e.error; }
      return next;
    });
    if (e.type === "completed") {
      setPhase("done");
      toast.success("Screening complete", `${e.processed} candidates ranked, audited and drafted.`);
      setTimeout(() => router.push(`/jobs/${id}/results`), 1200);
    }
    if (e.type === "failed") {
      setPhase("idle");
      toast.error("Pipeline failed", e.error ?? undefined);
      existing.refetch();
    }
  }, [id, router, toast, existing]);
  // Latest handler via ref so the SSE subscription isn't torn down on every render.
  const applyEventRef = useRef(applyEvent);
  applyEventRef.current = applyEvent;

  const follow = useCallback(() => {
    unsubscribe.current?.();
    unsubscribe.current = api.jobs.watchRun(id, (snap) => {
      if (snap.status === "idle") return;
      setLive((prev) => ({
        phase: snap.status === "running" ? "running" : snap.status === "completed" ? "completed" : "failed",
        stage: snap.stage ?? "jd", total: snap.total ?? prev?.total ?? 0, progress: prev?.progress ?? {},
        log: snap.events ?? [], error: snap.error,
      }));
      if (snap.status === "running") setPhase("running");
    }, (e) => applyEventRef.current(e), () => {
      // Stream dropped (proxy timeout, flaky network): fall back to polling so the page never hangs.
      const timer = setInterval(async () => {
        const s = await api.jobs.runStatus(id).catch(() => null);
        if (!s) return;
        setLive((prev) => (prev ? { ...prev, stage: s.stage ?? prev.stage } : prev));
        if (s.status === "running") return;
        clearInterval(timer);
        applyEventRef.current(s.status === "failed"
          ? { type: "failed", error: s.error ?? "Pipeline failed" }
          : { type: "completed", processed: s.total });
      }, 3000);
      unsubscribe.current = () => clearInterval(timer);
    });
  }, [id]);

  // Re-attach to a run that's already in progress (e.g. after a page reload).
  useEffect(() => {
    api.jobs.runStatus(id).then((s) => { if (s.status === "running") follow(); }).catch(() => {});
    return () => unsubscribe.current?.();
  }, [id, follow]);

  const run = async (withUpload: boolean) => {
    try {
      if (withUpload && files.length) {
        setPhase("uploading");
        setLive({ phase: "uploading", stage: "upload", total: existingCount + files.length, progress: {}, log: [] });
        const res = await api.jobs.upload(id, files);
        if (res.skipped.length) {
          toast.info(`${res.skipped.length} file(s) skipped`, res.skipped.map((s) => `${s.filename}: ${s.reason}`).join(" · "));
        }
        const flagged = res.uploaded.filter((u) => u.integrity_risk !== "low");
        if (flagged.length) {
          toast.error(`${flagged.length} resume(s) flagged by integrity guardrails`,
            `${flagged.map((f) => f.filename).join(", ")}: hidden or injected instructions were removed before screening.`);
        }
        if (!res.uploaded.length && !existingCount) {
          setPhase("idle");
          setLive(null);
          return;
        }
      }
      const started = await api.jobs.startRun(id);
      setPhase("running");
      setLive({ phase: "running", stage: "jd", total: started.total, progress: {}, log: [] });
      follow();
    } catch (e) {
      setPhase("idle");
      setLive(null);
      toast.error("Pipeline failed", e instanceof Error ? e.message : undefined);
      existing.refetch();
    }
  };

  const removeExisting = async (candidateId: string) => {
    try {
      await api.candidates.remove(candidateId);
      existing.setData((prev) => prev?.filter((c) => c.candidate_id !== candidateId));
    } catch (e) {
      toast.error("Couldn't remove resume", e instanceof Error ? e.message : undefined);
    }
  };

  if (job.error) return <ErrorState message={job.error} onRetry={job.refetch} />;
  const jd = job.data?.parsed_jd;

  return (
    <>
      <Link href="/jobs" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-subtle hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Jobs
      </Link>
      <PageHeader
        eyebrow="Step 2 of 3 · Add candidates"
        title={job.data ? job.data.title : <Skeleton className="h-8 w-64" />}
        description="Drop in resumes and run the agent pipeline. Re-running re-scores everyone against the latest requirements."
        actions={job.data?.stats.processed_count ? <ButtonLink href={`/jobs/${id}/results`} variant="secondary">View shortlist</ButtonLink> : undefined}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {busy || phase === "done" ? (
            <PipelineProgress run={live ?? { phase: "running", stage: "jd", total: existingCount, progress: {}, log: [] }} />
          ) : (
            <>
              <motion.div
                onDragEnter={(e) => { e.preventDefault(); dragDepth.current++; setDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); if (--dragDepth.current <= 0) setDragging(false); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); dragDepth.current = 0; setDragging(false); addFiles(e.dataTransfer.files); }}
                onClick={() => inputRef.current?.click()}
                animate={{ scale: dragging ? 1.01 : 1 }}
                className={cn(
                  "relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors",
                  dragging ? "border-brand bg-brand/[0.07]" : "border-line bg-surface hover:border-brand/50 hover:bg-brand/[0.03]"
                )}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
                aria-label="Upload resumes"
              >
                <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-50" />
                <motion.div
                  animate={dragging ? { y: -6, scale: 1.08 } : { y: [0, -4, 0] }}
                  transition={dragging ? { type: "spring" } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="relative grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-white shadow-lift"
                >
                  <UploadCloud className="h-7 w-7" />
                </motion.div>
                <h3 className="relative mt-5 text-base font-semibold text-ink">{dragging ? "Drop to add resumes" : "Drag & drop resumes here"}</h3>
                <p className="relative mt-1 text-sm text-ink-muted">
                  or <span className="font-medium text-brand-soft">browse files</span> · PDF, DOCX or TXT · up to {MAX_MB} MB each
                </p>
                <input ref={inputRef} type="file" multiple accept={ACCEPTED.join(",")} className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
              </motion.div>

              {rejected.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/[0.06] p-4 text-xs text-ink">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <div>
                    <p className="font-medium">{rejected.length} file(s) not added</p>
                    <p className="mt-0.5 text-ink-muted">{rejected.map((r) => `${r.name} (${r.reason})`).join(", ")}</p>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card>
                      <CardHeader
                        title={`Ready to upload · ${files.length}`}
                        subtitle={formatBytes(files.reduce((a, f) => a + f.size, 0))}
                        action={<Button variant="ghost" size="sm" onClick={() => setFiles([])}>Clear</Button>}
                      />
                      <ul className="grid max-h-72 gap-2 overflow-y-auto p-5 sm:grid-cols-2">
                        <AnimatePresence initial={false}>
                          {files.map((f) => (
                            <motion.li key={`${f.name}-${f.size}`} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                              className="flex items-center gap-3 rounded-xl border border-line bg-elevated/40 px-3 py-2.5">
                              <FileText className="h-4 w-4 shrink-0 text-brand-soft" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-xs font-medium text-ink">{f.name}</div>
                                <div className="text-[11px] text-ink-subtle">{formatBytes(f.size)}</div>
                              </div>
                              <button onClick={() => setFiles((p) => p.filter((x) => x !== f))} className="rounded-md p-1 text-ink-subtle hover:bg-line hover:text-ink" aria-label={`Remove ${f.name}`}>
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-subtle">
                  {existingCount > 0 ? `${existingCount} resume(s) already on this job${unprocessed ? ` · ${unprocessed} not yet screened` : ""}.` : "No resumes on this job yet."}
                </p>
                <div className="flex gap-2">
                  {existingCount > 0 && files.length === 0 && (
                    <Button variant="secondary" onClick={() => run(false)}><RefreshCw className="h-4 w-4" /> Re-run pipeline</Button>
                  )}
                  <Button size="lg" onClick={() => run(true)} disabled={files.length === 0}>
                    <Play className="h-4 w-4" /> Upload & screen {files.length > 0 && `${files.length} resume${files.length === 1 ? "" : "s"}`}
                  </Button>
                </div>
              </div>
            </>
          )}

          {existingCount > 0 && (
            <Card>
              <CardHeader title="Resumes on this job" subtitle={`${existingCount} total`} />
              <div className="overflow-x-auto p-2">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-line">
                    {existing.data!.map((c) => (
                      <tr key={c.candidate_id} className="group">
                        <td className="px-3 py-2.5">
                          <Link href={`/candidates/${c.candidate_id}`} className="font-medium text-ink hover:text-brand-soft">{c.name}</Link>
                          <div className="text-[11px] text-ink-subtle">{c.filename}</div>
                        </td>
                        <td className="px-3 py-2.5"><Badge tone={STATUS_TONE[c.status]} dot>{c.status}</Badge></td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-ink">{pct(c.final_score)}</td>
                        <td className="w-10 px-2 py-2.5 text-right">
                          <button disabled={busy} onClick={() => removeExisting(c.candidate_id)} aria-label={`Remove ${c.name}`}
                            className="rounded-md p-1.5 text-ink-subtle opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100 focus:opacity-100">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="xl:sticky xl:top-24">
            <CardHeader title="What we're matching against" subtitle="Extracted by the JD Agent" icon={<CheckCircle2 className="h-4 w-4" />} />
            <div className="space-y-5 p-5">
              {!job.data ? (
                <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-16" /></div>
              ) : !jd ? (
                <p className="text-sm text-ink-subtle">Requirements will be extracted when the pipeline runs.</p>
              ) : (
                <>
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Must-have skills</div>
                    <div className="flex flex-wrap gap-1.5">{jd.must_have_skills.map((s) => <SkillChip key={s} tone="match">{s}</SkillChip>)}</div>
                  </div>
                  {jd.preferred_skills.length > 0 && (
                    <div>
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Nice to have</div>
                      <div className="flex flex-wrap gap-1.5">{jd.preferred_skills.map((s) => <SkillChip key={s}>{s}</SkillChip>)}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-elevated/60 p-3">
                      <div className="text-ink-subtle">Experience</div>
                      <div className="mt-0.5 font-display text-lg font-semibold text-ink">{jd.experience_years}+ yrs</div>
                    </div>
                    <div className="rounded-xl bg-elevated/60 p-3">
                      <div className="flex items-center gap-1 text-ink-subtle"><GraduationCap className="h-3 w-3" /> Education</div>
                      <div className="mt-0.5 line-clamp-2 text-sm font-medium text-ink">{jd.education || "Not specified"}</div>
                    </div>
                  </div>
                  {jd.responsibilities.length > 0 && (
                    <div>
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Key responsibilities</div>
                      <ul className="space-y-1.5 text-xs text-ink-muted">
                        {jd.responsibilities.slice(0, 5).map((r) => <li key={r} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />{r}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
