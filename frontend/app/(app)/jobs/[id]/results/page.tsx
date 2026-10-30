"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowUpRight, Bot, ChevronDown, Download, GitCompareArrows, Mail, NotebookPen, Scale, Search, Sparkles,
  Trophy, Upload, Users,
} from "lucide-react";
import { api } from "@/lib/api";
import type { EmailDraft, MatchResult, MatchStatus } from "@/lib/types";
import { useQuery } from "@/lib/hooks";
import { cn, pct, scoreLabel } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { Avatar, Card, CardHeader, EmptyState, ErrorState, PageHeader, Segmented, SkillChip, Skeleton } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { ScoreBar, ScoreRing } from "@/components/ui/score";
import { useToast } from "@/components/ui/toast";
import { ColumnChart, ScoreRadar } from "@/components/charts/charts";
import { StatusSelect } from "@/components/features/status-select";
import { BiasAuditModal } from "@/components/features/bias-audit-modal";
import { ExecutiveReportModal } from "@/components/features/report-modal";
import { EmailReview } from "@/components/features/email-review";
import { IntegrityBadge } from "@/components/features/integrity";

type SortKey = "score" | "experience" | "skills" | "name";
type StatusFilter = "all" | MatchStatus;

const BANDS = [[0, 0.4, "0-40"], [0.4, 0.55, "40-55"], [0.55, 0.7, "55-70"], [0.7, 0.85, "70-85"], [0.85, 1.01, "85-100"]] as const;

function NotesEditor({ match, onSaved }: { match: MatchResult; onSaved: (m: MatchResult) => void }) {
  const toast = useToast();
  const [notes, setNotes] = useState(match.notes);
  const [saving, setSaving] = useState(false);
  const dirty = notes !== match.notes;
  const save = async () => {
    setSaving(true);
    try {
      onSaved(await api.matches.update(match.id, { notes }));
      toast.success("Notes saved");
    } catch (e) {
      toast.error("Couldn't save notes", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle"><NotebookPen className="h-3.5 w-3.5" /> Recruiter notes</div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Private notes for your hiring team…" className="field resize-none text-xs" />
      {dirty && (
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setNotes(match.notes)}>Discard</Button>
          <Button size="sm" onClick={save} loading={saving}>Save notes</Button>
        </div>
      )}
    </div>
  );
}

function CandidateRow({ m, rank, expanded, onToggle, selected, onSelect, onUpdate, canSelect }: {
  m: MatchResult; rank: number; expanded: boolean; onToggle: () => void; selected: boolean; onSelect: () => void;
  onUpdate: (m: MatchResult) => void; canSelect: boolean;
}) {
  const toast = useToast();
  const [updating, setUpdating] = useState(false);

  const changeStatus = async (status: MatchStatus) => {
    setUpdating(true);
    const prev = m;
    onUpdate({ ...m, status }); // optimistic
    try {
      onUpdate(await api.matches.update(m.id, { status }));
      toast.success(`${m.candidate_name} → ${status}`);
    } catch (e) {
      onUpdate(prev);
      toast.error("Couldn't update status", e instanceof Error ? e.message : undefined);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <motion.li layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3, delay: Math.min(rank, 12) * 0.025 }}
      className={cn("rounded-2xl border bg-surface transition-colors", expanded ? "border-brand/30 shadow-lift" : "border-line hover:border-ink-subtle/40")}>
      <div className="flex cursor-pointer items-center gap-3 p-4 md:gap-4" onClick={onToggle}>
        <input
          type="checkbox"
          checked={selected}
          disabled={!selected && !canSelect}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 shrink-0 cursor-pointer rounded border-line accent-[rgb(var(--brand))]"
          aria-label={`Select ${m.candidate_name} to compare`}
        />
        <div className={cn("hidden w-7 shrink-0 text-center font-display text-sm font-semibold sm:block", rank <= 3 ? "text-brand-soft" : "text-ink-subtle")}>
          {rank <= 3 ? <Trophy className="mx-auto h-4 w-4" /> : `#${rank}`}
        </div>
        <ScoreRing score={m.final_score} size={50} stroke={4.5} />
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={m.candidate_name} size={36} className="hidden md:inline-grid" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-ink">{m.candidate_name}</span>
              <span className="hidden text-[11px] text-ink-subtle sm:inline">{scoreLabel(m.final_score)}</span>
              <IntegrityBadge risk={m.integrity_risk} />
            </div>
            <div className="truncate text-xs text-ink-muted">
              {m.total_experience_years ? `${m.total_experience_years} yrs · ` : ""}{m.matched_skills.length} matched · {m.missing_skills.length} missing
            </div>
          </div>
        </div>
        <div className="hidden max-w-[260px] flex-wrap justify-end gap-1 lg:flex">
          {m.matched_skills.slice(0, 3).map((s) => <SkillChip key={s} tone="match">{s}</SkillChip>)}
          {m.missing_skills.slice(0, 1).map((s) => <SkillChip key={s} tone="miss">{s}</SkillChip>)}
        </div>
        <StatusSelect value={m.status} onChange={changeStatus} disabled={updating} />
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-subtle transition-transform", expanded && "rotate-180")} />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="grid gap-6 border-t border-line p-5 lg:grid-cols-[240px_1fr_1fr]">
              <ScoreRadar
                size={240}
                scores={[
                  { label: "Semantic", value: m.semantic_score },
                  { label: "Skills", value: m.skill_score },
                  { label: "Experience", value: m.experience_score },
                  { label: "Projects", value: m.project_score },
                  { label: "Education", value: m.education_score },
                ]}
              />
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Why this score</div>
                  <p className="text-sm leading-relaxed text-ink">{m.reasoning || "No reasoning recorded."}</p>
                </div>
                <div className="space-y-3">
                  <ScoreBar label="Semantic similarity" weight="35%" score={m.semantic_score} />
                  <ScoreBar label="Skill alignment" weight="30%" score={m.skill_score} />
                  <ScoreBar label="Experience" weight="15%" score={m.experience_score} />
                  <ScoreBar label="Projects" weight="10%" score={m.project_score} />
                  <ScoreBar label="Education" weight="10%" score={m.education_score} />
                </div>
                <p className="text-[11px] text-ink-subtle">Confidence {pct(m.confidence_score)}% — based on how complete the parsed profile is.</p>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Matched skills · {m.matched_skills.length}</div>
                  <div className="flex flex-wrap gap-1.5">{m.matched_skills.length ? m.matched_skills.map((s) => <SkillChip key={s} tone="match">{s}</SkillChip>) : <span className="text-xs text-ink-subtle">None</span>}</div>
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Missing skills · {m.missing_skills.length}</div>
                  <div className="flex flex-wrap gap-1.5">{m.missing_skills.length ? m.missing_skills.map((s) => <SkillChip key={s} tone="miss">{s}</SkillChip>) : <span className="text-xs text-success">No gaps</span>}</div>
                </div>
                <NotesEditor match={m} onSaved={onUpdate} />
                <ButtonLink href={`/candidates/${m.candidate_id}`} variant="secondary" size="sm" className="w-full">
                  Full profile, resume chat & interview kit <ArrowUpRight className="h-3.5 w-3.5" />
                </ButtonLink>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const job = useQuery(() => api.jobs.get(id), [id]);
  const results = useQuery(() => api.jobs.results(id), [id]);
  const [drafts, setDrafts] = useState<EmailDraft[] | null>(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<SortKey>("score");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [modal, setModal] = useState<"audit" | "report" | "email" | null>(null);

  const all = results.data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = all.filter((m) =>
      (status === "all" || m.status === status) &&
      m.final_score * 100 >= minScore &&
      (!q || `${m.candidate_name} ${m.candidate_email} ${m.matched_skills.join(" ")}`.toLowerCase().includes(q))
    );
    const sorters: Record<SortKey, (a: MatchResult, b: MatchResult) => number> = {
      score: (a, b) => b.final_score - a.final_score,
      experience: (a, b) => b.total_experience_years - a.total_experience_years,
      skills: (a, b) => b.skill_score - a.skill_score,
      name: (a, b) => a.candidate_name.localeCompare(b.candidate_name),
    };
    return [...list].sort(sorters[sort]);
  }, [all, query, status, minScore, sort]);

  const rankOf = useMemo(() => new Map([...all].sort((a, b) => b.final_score - a.final_score).map((m, i) => [m.id, i + 1])), [all]);
  const count = (s: MatchStatus) => all.filter((m) => m.status === s).length;
  const distribution = BANDS.map(([lo, hi, label]) => ({ label, count: all.filter((m) => m.final_score >= lo && m.final_score < hi).length }));
  const avg = all.length ? all.reduce((a, m) => a + m.final_score, 0) / all.length : 0;

  const updateMatch = (m: MatchResult) => results.setData((prev) => prev?.map((x) => (x.id === m.id ? m : x)));
  const toggleSelect = (cid: string) => setSelected((s) => (s.includes(cid) ? s.filter((x) => x !== cid) : [...s, cid]));

  const openEmails = async () => {
    setModal("email");
    if (!drafts) setDrafts(await api.emails.forJob(id).catch(() => []));
  };

  if (results.error) return <ErrorState message={results.error} onRetry={results.refetch} />;

  return (
    <>
      <Link href="/jobs" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-subtle hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Jobs
      </Link>
      <PageHeader
        eyebrow={job.data ? [job.data.department, job.data.location, job.data.employment_type].filter(Boolean).join(" · ") || "Shortlist" : "Shortlist"}
        title={job.data?.title ?? <Skeleton className="h-8 w-72" />}
        description="Ranked by hybrid semantic + rule-based scoring. Expand any candidate to see exactly why."
        actions={
          <>
            <ButtonLink href={`/jobs/${id}/upload`} variant="ghost"><Upload className="h-4 w-4" /> Add resumes</ButtonLink>
            <ButtonLink href={`/copilot?job=${id}`} variant="outline"><Bot className="h-4 w-4" /> Ask Copilot</ButtonLink>
            <Button variant="secondary" onClick={() => setModal("audit")}><Scale className="h-4 w-4" /> Fairness audit</Button>
            <Button variant="secondary" onClick={() => setModal("report")}><Sparkles className="h-4 w-4" /> Report</Button>
            <Button variant="secondary" onClick={openEmails}><Mail className="h-4 w-4" /> Emails</Button>
            <a href={api.jobs.exportUrl(id)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-strong">
              <Download className="h-4 w-4" /> Export CSV
            </a>
          </>
        }
      />

      {results.loading && !results.data ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : all.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No candidates screened yet"
          description="Upload resumes and run the pipeline to build a ranked shortlist."
          action={<ButtonLink href={`/jobs/${id}/upload`}><Upload className="h-4 w-4" /> Upload resumes</ButtonLink>}
        />
      ) : (
        <div className="grid gap-6 2xl:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Segmented
                value={status}
                onChange={setStatus}
                options={[
                  { value: "all", label: "All", count: all.length },
                  { value: "Shortlisted", label: "Shortlisted", count: count("Shortlisted") },
                  { value: "Interview", label: "Interview", count: count("Interview") },
                  { value: "Pending", label: "Pending", count: count("Pending") },
                  { value: "Rejected", label: "Rejected", count: count("Rejected") },
                ]}
                className="overflow-x-auto"
              />
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
                  <input className="field h-10 py-0 pl-9" placeholder="Name or skill…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <select className="field h-10 w-auto py-0" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort by">
                  <option value="score">Sort: Best match</option>
                  <option value="skills">Sort: Skill fit</option>
                  <option value="experience">Sort: Experience</option>
                  <option value="name">Sort: Name</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3">
              <label htmlFor="min" className="shrink-0 text-xs text-ink-muted">Minimum score</label>
              <input id="min" type="range" min={0} max={95} step={5} value={minScore} onChange={(e) => setMinScore(+e.target.value)} className="flex-1 accent-[rgb(var(--brand))]" />
              <span className="w-10 text-right text-sm font-semibold tabular-nums text-ink">{minScore}</span>
              <span className="hidden text-xs text-ink-subtle sm:inline">{filtered.length} of {all.length} shown</span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState icon={<Search className="h-6 w-6" />} title="No candidates match these filters" description="Lower the minimum score or clear the search." />
            ) : (
              <ul className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {filtered.map((m) => (
                    <CandidateRow
                      key={m.id}
                      m={m}
                      rank={rankOf.get(m.id) ?? 0}
                      expanded={expanded === m.id}
                      onToggle={() => setExpanded((e) => (e === m.id ? null : m.id))}
                      selected={selected.includes(m.candidate_id)}
                      canSelect={selected.length < 4}
                      onSelect={() => toggleSelect(m.candidate_id)}
                      onUpdate={updateMatch}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          <aside className="space-y-6">
            <Card>
              <CardHeader title="Batch overview" />
              <div className="grid grid-cols-2 gap-3 p-5">
                {[
                  ["Screened", all.length],
                  ["Average", pct(avg, 1)],
                  ["Shortlisted", count("Shortlisted") + count("Interview")],
                  ["Top score", pct(all[0]?.final_score ?? 0)],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl bg-elevated/60 p-3">
                    <div className="text-[11px] text-ink-subtle">{k}</div>
                    <div className="mt-0.5 font-display text-xl font-semibold tabular-nums text-ink">{v}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader title="Score distribution" subtitle="Candidates per score band" />
              <div className="px-5 pb-5 pt-6"><ColumnChart data={distribution} height={140} /></div>
            </Card>
          </aside>
        </div>
      )}

      {/* Compare tray */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="fixed inset-x-0 bottom-5 z-50 mx-auto flex w-[min(560px,calc(100vw-2rem))] items-center gap-3 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex -space-x-2">
              {selected.map((cid) => {
                const m = all.find((x) => x.candidate_id === cid);
                return m ? <Avatar key={cid} name={m.candidate_name} size={30} /> : null;
              })}
            </div>
            <span className="flex-1 text-sm text-ink">{selected.length} selected <span className="text-ink-subtle">· up to 4</span></span>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Button>
            <Button size="sm" disabled={selected.length < 2} onClick={() => router.push(`/compare?ids=${selected.join(",")}`)}>
              <GitCompareArrows className="h-3.5 w-3.5" /> Compare
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <BiasAuditModal jobId={id} open={modal === "audit"} onClose={() => setModal(null)} />
      <ExecutiveReportModal jobId={id} jobTitle={job.data?.title ?? ""} open={modal === "report"} onClose={() => setModal(null)} />
      <Modal open={modal === "email"} onClose={() => setModal(null)} size="xl" icon={<Mail className="h-5 w-5" />} title="Candidate emails"
        subtitle="AI-drafted, personalized, and held for your approval">
        {drafts === null ? <Skeleton className="h-[480px]" /> : (
          <EmailReview drafts={drafts} height="h-[520px]" onChange={(d) => setDrafts((prev) => prev?.map((x) => (x.id === d.id ? d : x)) ?? null)} />
        )}
      </Modal>
    </>
  );
}
