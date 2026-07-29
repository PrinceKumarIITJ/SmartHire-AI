"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import {
  Trophy,
  ArrowLeft,
  Sparkles,
  Scale,
  FileText,
  Mail,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MessageSquare,
  BarChart3
} from "lucide-react";
import ScoreRadarChart from "@/components/ScoreRadarChart";
import BiasAuditModal from "@/components/BiasAuditModal";
import ExecutiveReportModal from "@/components/ExecutiveReportModal";
import EmailDraftModal from "@/components/EmailDraftModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface MatchResult {
  id: string;
  job_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  filename: string;
  semantic_score: number;
  skill_score: number;
  experience_score: number;
  project_score: number;
  education_score: number;
  final_score: number;
  confidence_score: number;
  matched_skills: string[];
  missing_skills: string[];
  reasoning: string;
  status: string;
}

export default function ResultsPage() {
  const { id } = useParams();
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modals state
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [targetCandidateId, setTargetCandidateId] = useState<string | undefined>(undefined);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/jobs/${id}/results`);
      setResults(res.data);
    } catch (err) {
      console.error("Failed to fetch results", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [id]);

  const toggleExpand = (matchId: string) => {
    setExpandedId(expandedId === matchId ? null : matchId);
  };

  const handleOpenEmailModal = (candidateId?: string) => {
    setTargetCandidateId(candidateId);
    setShowEmailModal(true);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
              Ranked Candidate Leaderboard <Trophy className="w-6 h-6 text-amber-400" />
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Multi-Agent evaluated candidates sorted by Explainable AI final match scores.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAuditModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-all"
            >
              <Scale className="w-4 h-4" />
              Bias Audit
            </button>

            <button
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 text-xs font-semibold border border-pink-500/30 transition-all"
            >
              <FileText className="w-4 h-4" />
              AI Hiring Report
            </button>

            <button
              onClick={() => handleOpenEmailModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Mail className="w-4 h-4" />
              Email Drafts
            </button>
          </div>
        </div>
      </div>

      {/* Results Leaderboard Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl glass-card border border-dashed border-gray-700">
          <Trophy className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-200">No candidate results available</h3>
          <p className="text-gray-400 text-sm mt-1 mb-6">
            Upload candidate resumes and run the Multi-Agent pipeline to generate scores.
          </p>
          <Link
            href={`/jobs/${id}/upload`}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
          >
            Upload Resumes
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((match, rankIdx) => {
            const isExpanded = expandedId === match.id;
            const finalScorePct = Math.round(match.final_score * 100);

            return (
              <div
                key={match.id}
                className="rounded-2xl glass-card border border-white/5 overflow-hidden transition-all"
              >
                {/* Compact Row */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    {/* Rank Badge */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                        rankIdx === 0
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : rankIdx === 1
                          ? "bg-gray-400/20 text-gray-200 border border-gray-400/40"
                          : rankIdx === 2
                          ? "bg-amber-700/20 text-amber-400 border border-amber-700/40"
                          : "bg-white/5 text-gray-400"
                      }`}
                    >
                      #{rankIdx + 1}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-white">{match.candidate_name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            match.status === "Shortlisted"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {match.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{match.filename}</p>
                    </div>
                  </div>

                  {/* Score & Controls */}
                  <div className="flex items-center space-x-6">
                    {/* Confidence Score Pill */}
                    <div className="hidden lg:block text-right">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase block">Confidence</span>
                      <span className="text-xs font-bold text-indigo-300">
                        {Math.round(match.confidence_score * 100)}%
                      </span>
                    </div>

                    {/* Final Score Pill */}
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase block">Match Score</span>
                      <span className="text-2xl font-black gradient-text">{finalScorePct}%</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/candidates/${match.candidate_id}`}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                        title="Candidate Detail & Chat"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => handleOpenEmailModal(match.candidate_id)}
                        className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition-colors"
                        title="Review Email Draft"
                      >
                        <Mail className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => toggleExpand(match.id)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Explainable AI Breakdown */}
                {isExpanded && (
                  <div className="p-6 border-t border-white/5 bg-black/30 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Radar Chart */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <h4 className="text-xs font-bold text-gray-300 mb-2 flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-indigo-400" /> Sub-Score Radar Breakdown
                        </h4>
                        <ScoreRadarChart
                          semanticScore={match.semantic_score}
                          skillScore={match.skill_score}
                          experienceScore={match.experience_score}
                          projectScore={match.project_score}
                          educationScore={match.education_score}
                        />
                      </div>

                      {/* Skill Matrices & Reasoning */}
                      <div className="space-y-4">
                        {/* Matched Skills */}
                        <div>
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mb-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Matched Skills ({match.matched_skills.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {match.matched_skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Missing Skills */}
                        <div>
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1 mb-1.5">
                            <XCircle className="w-3.5 h-3.5" /> Missing Skills ({match.missing_skills.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {match.missing_skills.length === 0 ? (
                              <span className="text-xs text-gray-500">None missing</span>
                            ) : (
                              match.missing_skills.map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                >
                                  {skill}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Explainable AI Reasoning Text */}
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300 space-y-1">
                          <span className="font-bold text-gray-200 block text-[11px] uppercase tracking-wider">
                            AI Evaluation Rationale
                          </span>
                          <p className="leading-relaxed opacity-90">{match.reasoning}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showAuditModal && <BiasAuditModal jobId={id as string} onClose={() => setShowAuditModal(false)} />}
      {showReportModal && <ExecutiveReportModal jobId={id as string} onClose={() => setShowReportModal(false)} />}
      {showEmailModal && (
        <EmailDraftModal
          jobId={id as string}
          candidateId={targetCandidateId}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>
  );
}
