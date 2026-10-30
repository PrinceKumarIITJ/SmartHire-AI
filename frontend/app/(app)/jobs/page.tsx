"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight, Briefcase, Clock, MapPin, MoreHorizontal, Pause, Play, Plus, Search, Trash2, Upload, Users, XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Job, JobStatus } from "@/lib/types";
import { useQuery } from "@/lib/hooks";
import { cn, timeAgo } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState, ErrorState, PageHeader, Segmented, SkillChip, Skeleton } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/modal";
import { ScoreRing } from "@/components/ui/score";
import { useToast } from "@/components/ui/toast";
import { CreateJobModal } from "@/components/features/create-job-modal";

const STATUS_BADGE: Record<JobStatus, { tone: "success" | "warning" | "neutral"; label: string }> = {
  open: { tone: "success", label: "Open" },
  paused: { tone: "warning", label: "Paused" },
  closed: { tone: "neutral", label: "Closed" },
};

const PIPELINE_LABEL = {
  awaiting_resumes: "Awaiting resumes",
  ready: "Ready to screen",
  completed: "Screened",
};

function JobMenu({ job, onChange, onDelete }: { job: Job; onChange: (s: JobStatus) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const item = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-ink-muted hover:bg-elevated hover:text-ink";
  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.preventDefault(); setOpen((o) => !o); }} aria-label="Job actions">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-line bg-surface p-1 shadow-xl"
          >
            {job.status !== "open" && <button className={item} onClick={() => { onChange("open"); setOpen(false); }}><Play className="h-3.5 w-3.5" /> Reopen</button>}
            {job.status === "open" && <button className={item} onClick={() => { onChange("paused"); setOpen(false); }}><Pause className="h-3.5 w-3.5" /> Pause</button>}
            {job.status !== "closed" && <button className={item} onClick={() => { onChange("closed"); setOpen(false); }}><XCircle className="h-3.5 w-3.5" /> Close role</button>}
            <div className="my-1 h-px bg-line" />
            <button className={cn(item, "text-danger hover:text-danger")} onClick={() => { onDelete(); setOpen(false); }}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function JobCard({ job, index, onStatus, onDelete }: { job: Job; index: number; onStatus: (s: JobStatus) => void; onDelete: () => void }) {
  const s = job.stats;
  const skills = job.parsed_jd?.must_have_skills ?? [];
  const progress = s.candidate_count ? s.processed_count / s.candidate_count : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("card card-hover group flex flex-col p-5", job.status === "closed" && "opacity-70")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_BADGE[job.status ?? "open"].tone} dot>{STATUS_BADGE[job.status ?? "open"].label}</Badge>
          <span className="text-[11px] text-ink-subtle">{PIPELINE_LABEL[s.pipeline_status]}</span>
        </div>
        <JobMenu job={job} onChange={onStatus} onDelete={onDelete} />
      </div>

      <Link href={s.processed_count ? `/jobs/${job.id}/results` : `/jobs/${job.id}/upload`} className="mt-3 block">
        <h3 className="line-clamp-1 text-lg font-semibold text-ink transition-colors group-hover:text-brand-soft">{job.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle">
          {job.department && <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{job.department}</span>}
          {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(job.created_at)}</span>
        </div>
      </Link>

      <div className="mt-4 flex min-h-[26px] flex-wrap gap-1.5">
        {skills.slice(0, 4).map((sk) => <SkillChip key={sk}>{sk}</SkillChip>)}
        {skills.length > 4 && <span className="self-center px-1 text-[11px] text-ink-subtle">+{skills.length - 4}</span>}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-line bg-elevated/40 p-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-subtle">Candidates</div>
          <div className="mt-0.5 font-display text-lg font-semibold tabular-nums text-ink">{s.candidate_count}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-subtle">Shortlist</div>
          <div className="mt-0.5 font-display text-lg font-semibold tabular-nums text-ink">{s.shortlisted_count + s.interview_count}</div>
        </div>
        <div className="flex items-center justify-end">
          {s.processed_count > 0 ? <ScoreRing score={s.top_score} size={44} stroke={4} label="top" /> : <span className="text-xs text-ink-subtle">No scores</span>}
        </div>
      </div>

      {s.candidate_count > 0 && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <ButtonLink href={`/jobs/${job.id}/upload`} variant="secondary" size="sm" className="flex-1"><Upload className="h-3.5 w-3.5" /> Resumes</ButtonLink>
        <ButtonLink href={`/jobs/${job.id}/results`} size="sm" className={cn("flex-1", !s.processed_count && "pointer-events-none opacity-50")} aria-disabled={!s.processed_count}>
          Shortlist <ArrowUpRight className="h-3.5 w-3.5" />
        </ButtonLink>
      </div>
    </motion.div>
  );
}

export default function JobsPage() {
  const toast = useToast();
  const { data: jobs, error, loading, refetch, setData } = useQuery(() => api.jobs.list(), []);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | JobStatus>("all");
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      setCreating(true);
      window.history.replaceState(null, "", "/jobs");
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (jobs ?? []).filter((j) =>
      (filter === "all" || (j.status ?? "open") === filter) &&
      (!q || `${j.title} ${j.department ?? ""} ${j.location ?? ""} ${(j.parsed_jd?.must_have_skills ?? []).join(" ")}`.toLowerCase().includes(q))
    );
  }, [jobs, filter, query]);

  const count = (s: JobStatus) => (jobs ?? []).filter((j) => (j.status ?? "open") === s).length;

  const updateStatus = async (job: Job, status: JobStatus) => {
    try {
      const updated = await api.jobs.update(job.id, { status });
      setData((prev) => prev?.map((j) => (j.id === job.id ? updated : j)));
      toast.success(`“${job.title}” is now ${status}`);
    } catch (e) {
      toast.error("Couldn't update job", e instanceof Error ? e.message : undefined);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.jobs.remove(toDelete.id);
      setData((prev) => prev?.filter((j) => j.id !== toDelete.id));
      toast.success("Job deleted");
      setToDelete(null);
    } catch (e) {
      toast.error("Couldn't delete job", e instanceof Error ? e.message : undefined);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Every role you're hiring for, with live pipeline progress."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New job</Button>}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: jobs?.length ?? 0 },
            { value: "open", label: "Open", count: count("open") },
            { value: "paused", label: "Paused", count: count("paused") },
            { value: "closed", label: "Closed", count: count("closed") },
          ]}
        />
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
          <input className="field pl-9" placeholder="Search title, team, skill…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : loading && !jobs ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[330px] rounded-2xl" />)}</div>
      ) : jobs && jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-6 w-6" />}
          title="No jobs yet"
          description="Create a role to start screening. The JD Agent will extract structured requirements from your description."
          action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Create job</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No matching jobs" description="Try a different filter or search term." />
      ) : (
        <motion.div layout className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {filtered.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} onStatus={(s) => updateStatus(job, s)} onDelete={() => setToDelete(job)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <CreateJobModal open={creating} onClose={() => setCreating(false)} onCreated={refetch} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete this job?"
        description={`“${toDelete?.title}” and all ${toDelete?.stats.candidate_count ?? 0} candidates, scores, reports and drafts will be permanently removed.`}
      />
    </>
  );
}
