"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, CheckCircle2, FileUp, Gauge, Mail, Plus, Sparkles, Target, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { cn, timeAgo } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import { ScoreRing } from "@/components/ui/score";
import { ColumnChart, SkillDemandChart } from "@/components/charts/charts";

const ACTIVITY_ICON: Record<string, React.ReactNode> = {
  job_created: <Briefcase className="h-3.5 w-3.5" />,
  resume_uploaded: <FileUp className="h-3.5 w-3.5" />,
  email_sent: <Mail className="h-3.5 w-3.5" />,
};

function Funnel({ stages }: { stages: { label: string; value: number; tone: string }[] }) {
  const max = Math.max(1, stages[0]?.value ?? 1);
  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const conv = i > 0 && stages[i - 1].value > 0 ? Math.round((s.value / stages[i - 1].value) * 100) : null;
        return (
          <div key={s.label}>
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="text-ink-muted">{s.label}</span>
              <span className="tabular-nums text-ink">
                <span className="font-semibold">{s.value}</span>
                {conv !== null && <span className="ml-2 text-ink-subtle">{conv}% of previous</span>}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-line/60">
              <motion.div
                className={cn("h-full rounded-full", s.tone)}
                initial={{ width: 0 }}
                animate={{ width: `${(s.value / max) * 100}%` }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const overview = useQuery(() => api.analytics(), []);
  const jobs = useQuery(() => api.jobs.list(), []);

  // Time-of-day text depends on the viewer's clock, so compute it after mount to avoid hydration mismatches.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const hour = now?.getHours() ?? 12;
  const greeting = !now ? "Welcome back" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (overview.error) return <ErrorState message={overview.error} onRetry={overview.refetch} />;
  const o = overview.data;
  const activeJobs = (jobs.data ?? []).filter((j) => j.status !== "closed").slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow={now ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : " "}
        title={<>{greeting} <span className="inline-block origin-[70%_70%] animate-[wave_2s_ease-in-out_1]">👋</span></>}
        description="Here's how your hiring pipeline is moving across every open role."
        actions={
          <>
            <ButtonLink href="/candidates" variant="secondary"><Users className="h-4 w-4" /> Talent pool</ButtonLink>
            <ButtonLink href="/jobs?new=1"><Plus className="h-4 w-4" /> New job</ButtonLink>
          </>
        }
      />

      {!o ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[124px] rounded-2xl" />)}</div>
      ) : o.total_jobs === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="Your workspace is ready"
          description="Create a job, upload a batch of resumes, and SmartHire's agents will rank, explain and audit every candidate."
          action={<ButtonLink href="/jobs?new=1"><Plus className="h-4 w-4" /> Create your first job</ButtonLink>}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard index={0} label="Open roles" value={o.open_jobs} icon={<Briefcase className="h-4 w-4" />} hint={`${o.total_jobs} total jobs`} />
            <StatCard index={1} label="Candidates screened" value={o.processed_candidates} icon={<Users className="h-4 w-4" />} accent="aqua"
              hint={`${o.total_candidates - o.processed_candidates} awaiting the pipeline`} />
            <StatCard index={2} label="Shortlisted + interviewing" value={o.shortlisted + o.interviews} icon={<Target className="h-4 w-4" />} accent="success"
              hint={o.processed_candidates ? `${Math.round(((o.shortlisted + o.interviews) / o.processed_candidates) * 100)}% of screened` : "—"} />
            <StatCard index={3} label="Average match score" value={o.avg_score * 100} decimals={1} icon={<Gauge className="h-4 w-4" />} accent="warning"
              hint={`${o.emails_sent} emails sent · ${o.emails_pending} awaiting review`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Score distribution" subtitle="Final match scores across every screened candidate" />
              <div className="px-5 pb-5 pt-6"><ColumnChart data={o.score_distribution} /></div>
            </Card>
            <Card>
              <CardHeader title="Hiring funnel" subtitle="From resume to interview" />
              <div className="px-5 pb-5 pt-6">
                <Funnel
                  stages={[
                    { label: "Resumes received", value: o.total_candidates, tone: "bg-ink-subtle/60" },
                    { label: "Screened by AI", value: o.processed_candidates, tone: "bg-info" },
                    { label: "Shortlisted", value: o.shortlisted + o.interviews, tone: "bg-brand" },
                    { label: "Interviewing", value: o.interviews, tone: "bg-success" },
                  ]}
                />
                <div className="mt-5 grid grid-cols-2 gap-2 border-t border-line pt-4 text-xs">
                  <div className="rounded-lg bg-elevated/60 p-3">
                    <div className="text-ink-subtle">Rejected</div>
                    <div className="mt-0.5 font-display text-lg font-semibold tabular-nums text-ink">{o.rejected}</div>
                  </div>
                  <div className="rounded-lg bg-elevated/60 p-3">
                    <div className="text-ink-subtle">Emails sent</div>
                    <div className="mt-0.5 font-display text-lg font-semibold tabular-nums text-ink">{o.emails_sent}</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Active roles"
                subtitle="Pipeline progress per job"
                action={<Link href="/jobs" className="inline-flex items-center gap-1 text-xs font-medium text-brand-soft hover:underline">All jobs <ArrowRight className="h-3 w-3" /></Link>}
              />
              <div className="divide-y divide-line px-2 pb-2 pt-3">
                {jobs.loading && !jobs.data && [0, 1, 2].map((i) => <Skeleton key={i} className="mx-3 my-3 h-12" />)}
                {activeJobs.map((j) => {
                  const progress = j.stats.candidate_count ? j.stats.processed_count / j.stats.candidate_count : 0;
                  return (
                    <Link key={j.id} href={j.stats.processed_count ? `/jobs/${j.id}/results` : `/jobs/${j.id}/upload`}
                      className="group flex items-center gap-4 rounded-xl px-3 py-3.5 transition-colors hover:bg-elevated/60">
                      <ScoreRing score={j.stats.top_score} size={42} stroke={4} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-ink">{j.title}</span>
                          {j.department && <span className="hidden text-xs text-ink-subtle sm:inline">· {j.department}</span>}
                        </div>
                        <div className="mt-1.5 flex items-center gap-3">
                          <div className="h-1 w-32 overflow-hidden rounded-full bg-line">
                            <div className="h-full rounded-full bg-brand" style={{ width: `${progress * 100}%` }} />
                          </div>
                          <span className="text-[11px] text-ink-subtle">{j.stats.processed_count}/{j.stats.candidate_count} screened</span>
                        </div>
                      </div>
                      <div className="hidden text-right sm:block">
                        <div className="text-sm font-semibold tabular-nums text-ink">{j.stats.shortlisted_count + j.stats.interview_count}</div>
                        <div className="text-[11px] text-ink-subtle">shortlisted</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </Link>
                  );
                })}
                {jobs.data && activeJobs.length === 0 && <p className="px-3 py-6 text-sm text-ink-subtle">No active roles.</p>}
              </div>
            </Card>

            <Card>
              <CardHeader title="Recent activity" />
              <ol className="relative mx-5 mb-5 mt-4 space-y-4 border-l border-line pl-5">
                {o.recent_activity.map((a, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative">
                    <span className="absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full border border-line bg-surface text-ink-subtle">
                      {ACTIVITY_ICON[a.kind] ?? <CheckCircle2 className="h-3.5 w-3.5" />}
                    </span>
                    <Link href={a.href || "#"} className="block text-sm text-ink hover:text-brand-soft">{a.title}</Link>
                    <div className="mt-0.5 flex gap-2 text-[11px] text-ink-subtle">
                      <span>{timeAgo(a.timestamp)}</span>
                      {a.subtitle && <span className="truncate">· {a.subtitle}</span>}
                    </div>
                  </motion.li>
                ))}
                {o.recent_activity.length === 0 && <li className="text-sm text-ink-subtle">Nothing yet.</li>}
              </ol>
            </Card>
          </div>

          {o.top_skills.length > 0 && (
            <Card>
              <CardHeader
                title="Skill demand vs. supply"
                subtitle="The most-requested skills across roles, and how many screened candidates have them"
                action={<Badge tone="brand">Top {o.top_skills.length}</Badge>}
              />
              <div className="px-5 pb-5 pt-5"><SkillDemandChart data={o.top_skills} /></div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
