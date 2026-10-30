"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Crown, GitCompareArrows, Minus, X } from "lucide-react";
import { api } from "@/lib/api";
import type { MatchResult } from "@/lib/types";
import { cn, pct } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Badge, EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { ScoreRing } from "@/components/ui/score";
import { STATUS_TONE } from "@/lib/utils";

const DIMENSIONS: { key: keyof MatchResult; label: string; weight: string }[] = [
  { key: "semantic_score", label: "Semantic similarity", weight: "35%" },
  { key: "skill_score", label: "Skill alignment", weight: "30%" },
  { key: "experience_score", label: "Experience", weight: "15%" },
  { key: "project_score", label: "Projects", weight: "10%" },
  { key: "education_score", label: "Education", weight: "10%" },
];

export default function ComparePage() {
  const [ids, setIds] = useState<string[] | null>(null);
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parsed = (new URLSearchParams(window.location.search).get("ids") ?? "").split(",").filter(Boolean).slice(0, 4);
    setIds(parsed);
    if (parsed.length < 2) return;
    Promise.all(parsed.map((id) => api.candidates.match(id)))
      .then(setMatches)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load candidates"));
  }, []);

  if (ids && ids.length < 2) {
    return (
      <>
        <PageHeader title="Compare candidates" description="Put finalists side by side across every scoring dimension." />
        <EmptyState icon={<GitCompareArrows className="h-6 w-6" />} title="Pick at least two candidates"
          description="Select candidates from a job's shortlist or the talent pool, then hit Compare."
          action={<ButtonLink href="/candidates">Open talent pool</ButtonLink>} />
      </>
    );
  }
  if (error) return <ErrorState message={error} />;
  if (!matches) return <Skeleton className="h-[600px] rounded-2xl" />;

  const best = (key: keyof MatchResult) => Math.max(...matches.map((m) => m[key] as number));
  const allSkills = Array.from(new Set(matches.flatMap((m) => [...m.matched_skills, ...m.missing_skills])));
  const leader = matches.reduce((a, b) => (b.final_score > a.final_score ? b : a));
  const cols = { gridTemplateColumns: `200px repeat(${matches.length}, minmax(180px, 1fr))` };

  return (
    <>
      <PageHeader title="Compare candidates" description="Best value in each row is highlighted. Skills are checked against each candidate's job requirements." />
      <div className="card overflow-x-auto">
        <div className="min-w-fit">
          {/* Header */}
          <div className="grid border-b border-line" style={cols}>
            <div className="p-5" />
            {matches.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className={cn("relative flex flex-col items-center gap-3 border-l border-line p-5 text-center", m.id === leader.id && "bg-brand/[0.05]")}>
                {m.id === leader.id && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand-soft"><Crown className="h-3 w-3" /> Leader</span>}
                <Avatar name={m.candidate_name} size={52} />
                <div>
                  <Link href={`/candidates/${m.candidate_id}`} className="font-semibold text-ink hover:text-brand-soft">{m.candidate_name}</Link>
                  <div className="mt-1"><Badge tone={STATUS_TONE[m.status]} dot>{m.status}</Badge></div>
                </div>
                <ScoreRing score={m.final_score} size={72} stroke={6} label="match" />
              </motion.div>
            ))}
          </div>

          {/* Score dimensions */}
          {DIMENSIONS.map((d) => {
            const top = best(d.key);
            return (
              <div key={d.key} className="grid border-b border-line" style={cols}>
                <div className="px-5 py-4 text-xs text-ink-muted">{d.label} <span className="text-ink-subtle">· {d.weight}</span></div>
                {matches.map((m) => {
                  const v = m[d.key] as number;
                  const isTop = v === top && matches.length > 1;
                  return (
                    <div key={m.id} className="border-l border-line px-5 py-4">
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className={cn("tabular-nums", isTop ? "font-semibold text-ink" : "text-ink-muted")}>{pct(v)}</span>
                        {isTop && <Crown className="h-3.5 w-3.5 text-brand-soft" />}
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-line">
                        <motion.div className={cn("h-full rounded-full", isTop ? "bg-brand" : "bg-ink-subtle/50")} initial={{ width: 0 }} animate={{ width: `${v * 100}%` }} transition={{ duration: 0.8 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div className="grid border-b border-line" style={cols}>
            <div className="px-5 py-4 text-xs text-ink-muted">Years of experience</div>
            {matches.map((m) => (
              <div key={m.id} className="border-l border-line px-5 py-4 text-sm tabular-nums text-ink">{m.total_experience_years || "—"}</div>
            ))}
          </div>

          {/* Skill matrix */}
          <div className="grid border-b border-line bg-elevated/40" style={cols}>
            <div className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Skill matrix</div>
            {matches.map((m) => <div key={m.id} className="border-l border-line px-5 py-3 text-[11px] text-ink-subtle">{m.matched_skills.length} matched</div>)}
          </div>
          {allSkills.map((skill) => (
            <div key={skill} className="grid border-b border-line last:border-0" style={cols}>
              <div className="truncate px-5 py-2.5 text-xs text-ink">{skill}</div>
              {matches.map((m) => {
                const has = m.matched_skills.includes(skill);
                const missing = m.missing_skills.includes(skill);
                return (
                  <div key={m.id} className="flex items-center border-l border-line px-5 py-2.5 text-xs">
                    {has ? <span className="inline-flex items-center gap-1.5 text-success"><Check className="h-3.5 w-3.5" /> Has it</span>
                      : missing ? <span className="inline-flex items-center gap-1.5 text-danger"><X className="h-3.5 w-3.5" /> Missing</span>
                      : <span className="inline-flex items-center gap-1.5 text-ink-subtle"><Minus className="h-3.5 w-3.5" /> Not required</span>}
                  </div>
                );
              })}
            </div>
          ))}

          <div className="grid" style={cols}>
            <div className="px-5 py-4 text-xs text-ink-muted">AI reasoning</div>
            {matches.map((m) => <p key={m.id} className="border-l border-line px-5 py-4 text-xs leading-relaxed text-ink-muted">{m.reasoning}</p>)}
          </div>
        </div>
      </div>
    </>
  );
}
