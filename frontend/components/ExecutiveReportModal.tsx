"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { FileText, CheckCircle2, AlertCircle, Lightbulb, RefreshCw } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface ExecutiveReportModalProps {
  jobId: string;
  onClose: () => void;
}

export default function ExecutiveReportModal({ jobId, onClose }: ExecutiveReportModalProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/reports/jobs/${jobId}`);
        setReport(res.data);
      } catch (err) {
        console.error("Failed to fetch executive report", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [jobId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl glass-panel p-6 space-y-6 border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Executive Hiring Report</h2>
              <p className="text-xs text-gray-400">Synthesized Talent Pool Analysis & Recommendations</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-bold">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-pink-400 animate-spin" />
          </div>
        ) : !report ? (
          <div className="text-center py-8 text-gray-400 text-sm">Failed to generate executive report.</div>
        ) : (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div className="p-5 rounded-xl bg-black/40 border border-white/5 space-y-2">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Executive Summary</h3>
              <p className="text-sm text-gray-200 leading-relaxed font-normal">{report.summary_text}</p>
            </div>

            {/* Strengths & Gaps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                  <CheckCircle2 className="w-4 h-4" /> Common Talent Strengths
                </h4>
                <ul className="space-y-1.5">
                  {report.key_strengths?.map((str: string, idx: number) => (
                    <li key={idx} className="text-xs text-emerald-200/90 flex items-start gap-1.5">
                      <span className="text-emerald-400">•</span> {str}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase">
                  <AlertCircle className="w-4 h-4" /> Talent Pool Skill Gaps
                </h4>
                <ul className="space-y-1.5">
                  {report.skill_gaps?.map((gap: string, idx: number) => (
                    <li key={idx} className="text-xs text-amber-200/90 flex items-start gap-1.5">
                      <span className="text-amber-400">•</span> {gap}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Hiring Recommendations */}
            <div className="p-5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
              <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase">
                <Lightbulb className="w-4 h-4 text-indigo-400" /> Actionable Interview & Hiring Recommendations
              </h4>
              <ul className="space-y-2">
                {report.hiring_recommendations?.map((rec: string, idx: number) => (
                  <li key={idx} className="text-xs text-indigo-100/90 flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 text-[10px] font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Close Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
