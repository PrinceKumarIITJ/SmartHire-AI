"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpDown, GitCompareArrows, Search, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { PoolStatus, TalentPoolItem } from "@/lib/types";
import { useDebounced, useQuery } from "@/lib/hooks";
import { cn, pct, STATUS_TONE, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, Badge, EmptyState, ErrorState, PageHeader, Segmented, SkillChip, Skeleton } from "@/components/ui/primitives";
import { ScoreRing } from "@/components/ui/score";
import { IntegrityBadge } from "@/components/features/integrity";

type SortKey = "score" | "name" | "experience" | "recent";

export default function TalentPoolPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const debounced = useDebounced(q, 250);
  const [status, setStatus] = useState<"all" | PoolStatus>("all");
  const [sort, setSort] = useState<SortKey>("score");
  const [selected, setSelected] = useState<string[]>([]);
  const pool = useQuery(() => api.candidates.pool({ q: debounced || undefined }), [debounced]);

  const rows = useMemo(() => {
    const list = (pool.data ?? []).filter((c) => status === "all" || c.status === status);
    const by: Record<SortKey, (a: TalentPoolItem, b: TalentPoolItem) => number> = {
      score: (a, b) => (b.final_score ?? -1) - (a.final_score ?? -1),
      name: (a, b) => a.name.localeCompare(b.name),
      experience: (a, b) => b.total_experience_years - a.total_experience_years,
      recent: (a, b) => b.created_at.localeCompare(a.created_at),
    };
    return [...list].sort(by[sort]);
  }, [pool.data, status, sort]);

  const count = (s: PoolStatus) => (pool.data ?? []).filter((c) => c.status === s).length;
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s));
  const SortHeader = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={cn("px-4 py-3 font-medium", className)}>
      <button onClick={() => setSort(k)} className={cn("inline-flex items-center gap-1 hover:text-ink", sort === k && "text-ink")}>
        {children} <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  return (
    <>
      <PageHeader
        title="Talent pool"
        description="Everyone you've screened, across every role. Search by name, skill or job."
        actions={
          <Button disabled={selected.length < 2} onClick={() => router.push(`/compare?ids=${selected.join(",")}`)}>
            <GitCompareArrows className="h-4 w-4" /> Compare {selected.length > 0 && `(${selected.length})`}
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={status}
          onChange={setStatus}
          className="overflow-x-auto"
          options={[
            { value: "all", label: "All", count: pool.data?.length ?? 0 },
            { value: "Shortlisted", label: "Shortlisted", count: count("Shortlisted") },
            { value: "Interview", label: "Interview", count: count("Interview") },
            { value: "Pending", label: "Pending", count: count("Pending") },
            { value: "Rejected", label: "Rejected", count: count("Rejected") },
            { value: "Unprocessed", label: "Unscreened", count: count("Unprocessed") },
          ]}
        />
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
          <input className="field pl-9" placeholder="Search name, email, skill, job…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {pool.error ? (
        <ErrorState message={pool.error} onRetry={pool.refetch} />
      ) : pool.loading && !pool.data ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title={q ? "No one matches that search" : "No candidates yet"}
          description={q ? "Try a different name or skill." : "Upload resumes to a job to start building your talent pool."} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-line bg-elevated/40 text-xs text-ink-muted">
                <tr>
                  <th className="w-10 px-4 py-3"><span className="sr-only">Select</span></th>
                  <SortHeader k="name">Candidate</SortHeader>
                  <th className="px-4 py-3 font-medium">Applied for</th>
                  <th className="px-4 py-3 font-medium">Top skills</th>
                  <SortHeader k="experience">Exp.</SortHeader>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <SortHeader k="score" className="text-right">Score</SortHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((c, i) => (
                  <motion.tr key={c.candidate_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 15) * 0.02 }}
                    className={cn("group transition-colors hover:bg-elevated/40", selected.includes(c.candidate_id) && "bg-brand/[0.04]")}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(c.candidate_id)} onChange={() => toggle(c.candidate_id)}
                        disabled={c.final_score === null} className="h-4 w-4 accent-[rgb(var(--brand))]" aria-label={`Select ${c.name}`} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/candidates/${c.candidate_id}`} className="flex items-center gap-3">
                        <Avatar name={c.name} size={34} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate font-medium text-ink group-hover:text-brand-soft">{c.name} <IntegrityBadge risk={c.integrity_risk} /></div>
                          <div className="truncate text-[11px] text-ink-subtle">{c.email || c.filename} · {timeAgo(c.created_at)}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><Link href={`/jobs/${c.job_id}/results`} className="text-xs text-ink-muted hover:text-ink">{c.job_title}</Link></td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-[260px] flex-wrap gap-1">
                        {c.skills.slice(0, 3).map((s) => <SkillChip key={s}>{s}</SkillChip>)}
                        {c.skills.length > 3 && <span className="text-[11px] text-ink-subtle">+{c.skills.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-ink-muted">{c.total_experience_years ? `${c.total_experience_years} yrs` : "—"}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[c.status]} dot>{c.status === "Unprocessed" ? "Unscreened" : c.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        {c.final_score !== null ? <ScoreRing score={c.final_score} size={38} stroke={3.5} /> : <span className="text-xs text-ink-subtle">{pct(null)}</span>}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
