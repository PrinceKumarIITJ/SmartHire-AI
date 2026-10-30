"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Award, Briefcase, FileText, FolderGit2, GraduationCap, Mail, MessagesSquare, Phone, Search, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { MatchResult, MatchStatus } from "@/lib/types";
import { useQuery } from "@/lib/hooks";
import { cn, formatDate, pct, scoreLabel } from "@/lib/utils";
import { Avatar, Card, CardHeader, ErrorState, Segmented, SkillChip, Skeleton } from "@/components/ui/primitives";
import { ScoreBar, ScoreRing } from "@/components/ui/score";
import { useToast } from "@/components/ui/toast";
import { ScoreRadar } from "@/components/charts/charts";
import { StatusSelect } from "@/components/features/status-select";
import { CandidateChat } from "@/components/features/candidate-chat";
import { InterviewKit } from "@/components/features/interview-kit";
import { IntegrityBadge, IntegrityPanel } from "@/components/features/integrity";

type Tab = "overview" | "resume" | "interview";

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term.trim()) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return <>{parts.map((p, i) => (p.toLowerCase() === term.toLowerCase() ? <mark key={i} className="rounded bg-warning/30 px-0.5 text-ink">{p}</mark> : p))}</>;
}

export default function CandidatePage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const candidate = useQuery(() => api.candidates.get(id), [id]);
  const match = useQuery(() => api.candidates.match(id).catch(() => null as MatchResult | null), [id]);
  const [tab, setTab] = useState<Tab>("overview");
  const [resumeQuery, setResumeQuery] = useState("");

  const c = candidate.data;
  const p = c?.parsed_profile;
  const m = match.data;
  const name = p?.name || c?.filename || "Candidate";

  const hits = useMemo(() => {
    if (!c || !resumeQuery.trim()) return 0;
    return c.raw_resume_text.toLowerCase().split(resumeQuery.toLowerCase()).length - 1;
  }, [c, resumeQuery]);

  const changeStatus = async (status: MatchStatus) => {
    if (!m) return;
    try {
      match.setData(await api.matches.update(m.id, { status }));
      toast.success(`Status set to ${status}`);
    } catch (e) {
      toast.error("Couldn't update status", e instanceof Error ? e.message : undefined);
    }
  };

  if (candidate.error) return <ErrorState message={candidate.error} onRetry={candidate.refetch} />;
  if (!c) return <div className="space-y-4"><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>;

  const matchedSet = new Set((m?.matched_skills ?? []).map((s) => s.toLowerCase()));

  return (
    <>
      <Link href={m ? `/jobs/${c.job_id}/results` : "/candidates"} className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-subtle hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> {m ? "Back to shortlist" : "Talent pool"}
      </Link>

      {/* Profile header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card relative mb-6 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-24 bg-brand-gradient opacity-90" />
        <div className="grid-backdrop absolute inset-x-0 top-0 h-24 opacity-30" />
        <div className="relative flex flex-col gap-5 px-6 pb-6 pt-12 md:flex-row md:items-end">
          <Avatar name={name} size={88} className="ring-4" />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">{name} {c.integrity_report && <IntegrityBadge risk={c.integrity_report.risk_level} />}</h1>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
              {p?.email && <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 hover:text-ink"><Mail className="h-3.5 w-3.5" />{p.email}</a>}
              {p?.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{p.phone}</span>}
              {p && <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{p.total_experience_years} yrs experience</span>}
              <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{c.filename} · {formatDate(c.created_at)}</span>
            </div>
          </div>
          {m ? (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[11px] text-ink-subtle">Match score</div>
                <div className="text-sm font-semibold text-ink">{scoreLabel(m.final_score)}</div>
              </div>
              <ScoreRing score={m.final_score} size={64} stroke={5} />
              <StatusSelect value={m.status} onChange={changeStatus} />
            </div>
          ) : (
            <span className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted">Not yet screened</span>
          )}
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-6">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "overview", label: <><Sparkles className="h-3.5 w-3.5" /> Overview</> },
              { value: "resume", label: <><FileText className="h-3.5 w-3.5" /> Resume</> },
              { value: "interview", label: <><MessagesSquare className="h-3.5 w-3.5" /> Interview kit</> },
            ]}
          />

          {tab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <IntegrityPanel report={c.integrity_report} />
              {m && (
                <Card>
                  <CardHeader title="Explainable match" subtitle="How the hybrid scoring model arrived at this candidate's score" />
                  <div className="grid gap-6 p-5 md:grid-cols-[260px_1fr]">
                    <ScoreRadar size={260} scores={[
                      { label: "Semantic", value: m.semantic_score },
                      { label: "Skills", value: m.skill_score },
                      { label: "Experience", value: m.experience_score },
                      { label: "Projects", value: m.project_score },
                      { label: "Education", value: m.education_score },
                    ]} />
                    <div className="space-y-4">
                      <p className="rounded-xl bg-elevated/50 p-4 text-sm leading-relaxed text-ink">{m.reasoning}</p>
                      <div className="space-y-3">
                        <ScoreBar label="Semantic similarity" weight="35%" score={m.semantic_score} />
                        <ScoreBar label="Skill alignment" weight="30%" score={m.skill_score} />
                        <ScoreBar label="Experience" weight="15%" score={m.experience_score} />
                        <ScoreBar label="Projects" weight="10%" score={m.project_score} />
                        <ScoreBar label="Education" weight="10%" score={m.education_score} />
                      </div>
                      <p className="text-[11px] text-ink-subtle">Model confidence {pct(m.confidence_score)}%</p>
                    </div>
                  </div>
                  {m.missing_skills.length > 0 && (
                    <div className="mx-5 mb-5 rounded-xl border border-danger/20 bg-danger/[0.04] p-4">
                      <div className="mb-2 text-xs font-semibold text-ink">Gaps against this role</div>
                      <div className="flex flex-wrap gap-1.5">{m.missing_skills.map((s) => <SkillChip key={s} tone="miss">{s}</SkillChip>)}</div>
                    </div>
                  )}
                </Card>
              )}

              {p && (
                <>
                  <Card>
                    <CardHeader title="Skills" subtitle={m ? "Highlighted skills match this role's requirements" : undefined} />
                    <div className="flex flex-wrap gap-1.5 p-5">
                      {p.skills.map((s) => <SkillChip key={s} tone={matchedSet.has(s.toLowerCase()) ? "match" : "neutral"}>{s}</SkillChip>)}
                      {p.skills.length === 0 && <span className="text-sm text-ink-subtle">No skills extracted.</span>}
                    </div>
                  </Card>

                  {p.work_experience.length > 0 && (
                    <Card>
                      <CardHeader title="Experience" icon={<Briefcase className="h-4 w-4" />} />
                      <ol className="relative mx-5 mb-5 mt-5 space-y-6 border-l border-line pl-6">
                        {p.work_experience.map((w, i) => (
                          <motion.li key={i} initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="relative">
                            <span className={cn("absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-surface", i === 0 ? "bg-brand" : "bg-ink-subtle/50")} />
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <h4 className="text-sm font-semibold text-ink">{w.role} <span className="font-normal text-ink-muted">· {w.company}</span></h4>
                              <span className="text-xs text-ink-subtle">{w.duration || (w.years ? `${w.years} yrs` : "")}</span>
                            </div>
                            {w.description && <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{w.description}</p>}
                          </motion.li>
                        ))}
                      </ol>
                    </Card>
                  )}

                  <div className="grid gap-6 md:grid-cols-2">
                    {p.projects.length > 0 && (
                      <Card>
                        <CardHeader title="Projects" icon={<FolderGit2 className="h-4 w-4" />} />
                        <ul className="space-y-4 p-5">
                          {p.projects.map((pr, i) => (
                            <li key={i}>
                              <div className="text-sm font-medium text-ink">{pr.name}</div>
                              {pr.description && <p className="mt-1 line-clamp-3 text-xs text-ink-muted">{pr.description}</p>}
                              {pr.technologies.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{pr.technologies.map((t) => <SkillChip key={t}>{t}</SkillChip>)}</div>}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}
                    <Card>
                      <CardHeader title="Education & certifications" icon={<GraduationCap className="h-4 w-4" />} />
                      <ul className="space-y-3 p-5">
                        {p.education.map((e, i) => (
                          <li key={i}>
                            <div className="text-sm font-medium text-ink">{e.degree}</div>
                            <div className="text-xs text-ink-muted">{e.institution}{e.year && ` · ${e.year}`}</div>
                          </li>
                        ))}
                        {p.certifications.map((cert) => (
                          <li key={cert} className="flex items-center gap-2 text-sm text-ink"><Award className="h-3.5 w-3.5 text-warning" />{cert}</li>
                        ))}
                        {p.education.length === 0 && p.certifications.length === 0 && <li className="text-sm text-ink-subtle">None listed.</li>}
                      </ul>
                    </Card>
                  </div>
                </>
              )}
              {!p && <Card className="p-6 text-sm text-ink-muted">This resume hasn't been parsed yet. Run the pipeline from the job's upload page.</Card>}
            </motion.div>
          )}

          {tab === "resume" && (
            <motion.div key="resume" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <div className="flex items-center gap-3 border-b border-line p-4">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
                    <input className="field h-10 py-0 pl-9" placeholder="Find in resume…" value={resumeQuery} onChange={(e) => setResumeQuery(e.target.value)} />
                  </div>
                  {resumeQuery && <span className="text-xs tabular-nums text-ink-muted">{hits} match{hits === 1 ? "" : "es"}</span>}
                </div>
                <pre className="max-h-[640px] overflow-y-auto whitespace-pre-wrap p-6 font-sans text-sm leading-relaxed text-ink-muted">
                  <Highlight text={c.raw_resume_text} term={resumeQuery} />
                </pre>
              </Card>
            </motion.div>
          )}

          {tab === "interview" && (
            <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <InterviewKit candidateId={id} candidateName={name} />
            </motion.div>
          )}
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <CandidateChat candidateId={id} candidateName={name} />
        </aside>
      </div>
    </>
  );
}
