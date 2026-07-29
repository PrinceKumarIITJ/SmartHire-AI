"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Plus, Briefcase, FileText, ArrowRight, Sparkles, CheckCircle2, Clock } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface Job {
  id: string;
  title: string;
  raw_jd: str;
  parsed_jd?: {
    must_have_skills: string[];
    experience_years: number;
    education: string;
  };
  created_at: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [rawJd, setRawJd] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/jobs`);
      setJobs(res.data);
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !rawJd) return;

    try {
      setSubmitting(true);
      const res = await axios.post(`${API_BASE}/jobs`, {
        title,
        raw_jd: rawJd,
      });
      setShowModal(false);
      setTitle("");
      setRawJd("");
      fetchJobs();
    } catch (err) {
      console.error("Failed to create job", err);
      alert("Failed to create job with JD Agent parsing.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-2xl glass-panel relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 z-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Active Job Openings <Sparkles className="w-6 h-6 text-indigo-400" />
          </h1>
          <p className="text-gray-400 text-sm max-w-xl">
            Create job roles, upload candidate resume batches, and trigger Multi-Agent AI evaluation with Explainable AI scoring.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="z-10 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          New Job Role
        </button>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl glass-card border border-dashed border-gray-700">
          <Briefcase className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-200">No jobs created yet</h3>
          <p className="text-gray-400 text-sm mt-1 mb-6">Create your first job posting to start AI candidate screening.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
          >
            Create Job
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div key={job.id} className="p-6 rounded-2xl glass-card flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 mb-3">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2 line-clamp-1">{job.title}</h2>
                <p className="text-gray-400 text-xs line-clamp-3 mb-4">{job.raw_jd}</p>

                {job.parsed_jd && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex flex-wrap gap-1.5">
                      {job.parsed_jd.must_have_skills?.slice(0, 4).map((skill, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {skill}
                        </span>
                      ))}
                      {(job.parsed_jd.must_have_skills?.length || 0) > 4 && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] text-gray-400">
                          +{(job.parsed_jd.must_have_skills?.length || 0) - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Link
                  href={`/jobs/${job.id}/upload`}
                  className="flex-1 text-center py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold border border-white/10 transition-colors"
                >
                  Upload Resumes
                </Link>
                <Link
                  href={`/jobs/${job.id}/results`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                >
                  Results <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Job Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl glass-panel p-6 space-y-6 border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Create New Job Role
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Job Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior AI Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Raw Job Description Text
                </label>
                <textarea
                  rows={8}
                  placeholder="Paste the full job description text here... (JD Agent will automatically extract required skills, experience, and responsibilities)"
                  value={rawJd}
                  onChange={(e) => setRawJd(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Extracting with JD Agent..." : "Save Job Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
