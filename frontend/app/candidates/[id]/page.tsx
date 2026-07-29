"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, User, Mail, Phone, GraduationCap, Briefcase, Code, Award, FileText } from "lucide-react";
import CandidateChatWidget from "@/components/CandidateChatWidget";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function CandidateDetailPage() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/candidates/${id}`);
        setCandidate(res.data);
      } catch (err) {
        console.error("Failed to fetch candidate", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidate();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="text-center py-16 text-gray-400">
        Candidate profile not found.
      </div>
    );
  }

  const prof = candidate.parsed_profile || {};
  const candName = prof.name || candidate.filename || "Candidate Profile";

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <Link
          href={`/jobs/${candidate.job_id}/results`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Candidate Leaderboard
        </Link>

        {/* Profile Card Header */}
        <div className="p-6 rounded-2xl glass-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              {candName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{candName}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mt-1">
                {prof.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" /> {prof.email}
                  </span>
                )}
                {prof.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" /> {prof.phone}
                  </span>
                )}
                <span className="flex items-center gap-1 text-indigo-300 font-semibold">
                  <Briefcase className="w-3.5 h-3.5" /> {prof.total_experience_years || 0} Years Exp
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Parsed Resume Detail */}
        <div className="lg:col-span-2 space-y-6">
          {/* Skills */}
          {prof.skills && prof.skills.length > 0 && (
            <div className="p-6 rounded-2xl glass-card space-y-3">
              <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-400" /> Technical & Core Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {prof.skills.map((skill: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Work Experience */}
          {prof.work_experience && prof.work_experience.length > 0 && (
            <div className="p-6 rounded-2xl glass-card space-y-4">
              <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" /> Work Experience
              </h3>
              <div className="space-y-4">
                {prof.work_experience.map((exp: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{exp.role}</span>
                      <span className="text-gray-400 font-mono text-[11px]">{exp.duration || `${exp.years} yrs`}</span>
                    </div>
                    <span className="text-indigo-400 font-semibold block">{exp.company}</span>
                    <p className="text-gray-300 mt-2 leading-relaxed opacity-90">{exp.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {prof.education && prof.education.length > 0 && (
            <div className="p-6 rounded-2xl glass-card space-y-4">
              <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-400" /> Educational Background
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prof.education.map((edu: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-black/30 border border-white/5 text-xs space-y-1">
                    <span className="font-bold text-white block">{edu.degree}</span>
                    <span className="text-gray-400">{edu.institution}</span>
                    {edu.year && <span className="text-[10px] text-gray-500 block">{edu.year}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Resume Text */}
          <div className="p-6 rounded-2xl glass-card space-y-3">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" /> Parsed Raw Resume Text
            </h3>
            <pre className="p-4 rounded-xl bg-black/50 border border-white/5 text-[11px] text-gray-400 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
              {candidate.raw_resume_text}
            </pre>
          </div>
        </div>

        {/* Right 1 Col: Candidate RAG Chat Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <CandidateChatWidget candidateId={candidate.id} candidateName={candName} />
          </div>
        </div>
      </div>
    </div>
  );
}
