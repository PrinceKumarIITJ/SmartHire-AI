"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { ShieldCheck, AlertTriangle, CheckCircle, Scale, RefreshCw } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface BiasAuditModalProps {
  jobId: string;
  onClose: () => void;
}

export default function BiasAuditModal({ jobId, onClose }: BiasAuditModalProps) {
  const [auditData, setAuditData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/audit/${jobId}`);
        setAuditData(res.data);
      } catch (err) {
        console.error("Failed to fetch audit report", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, [jobId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl glass-panel p-6 space-y-6 border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Demographic-Blind Bias & Fairness Audit</h2>
              <p className="text-xs text-gray-400">80% Rule (Four-Fifths) Disparate Impact Analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-bold">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : !auditData ? (
          <div className="text-center py-8 text-gray-400 text-sm">Failed to load bias audit report.</div>
        ) : (
          <div className="space-y-6">
            {/* Status Summary Banner */}
            <div className={`p-5 rounded-xl border flex items-start space-x-4 ${
              auditData.disparate_impact_summary?.disparate_impact_detected
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}>
              {auditData.disparate_impact_summary?.disparate_impact_detected ? (
                <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5 text-amber-400" />
              ) : (
                <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-emerald-400" />
              )}
              <div className="space-y-1">
                <h4 className="text-sm font-bold">
                  {auditData.disparate_impact_summary?.disparate_impact_detected
                    ? "Disparate Impact Warning Detected"
                    : "Fairness Audit Clean (Passes 80% Rule)"}
                </h4>
                <p className="text-xs leading-relaxed opacity-90">
                  {auditData.disparate_impact_summary?.summary}
                </p>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center">
                <span className="block text-2xl font-extrabold text-white">
                  {auditData.disparate_impact_summary?.total_candidates || 0}
                </span>
                <span className="text-[11px] text-gray-400">Total Evaluated</span>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center">
                <span className="block text-2xl font-extrabold text-indigo-400">
                  {auditData.disparate_impact_summary?.standard_shortlisted || 0}
                </span>
                <span className="text-[11px] text-gray-400">Standard Shortlisted</span>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center">
                <span className="block text-2xl font-extrabold text-purple-400">
                  {auditData.disparate_impact_summary?.blind_shortlisted || 0}
                </span>
                <span className="text-[11px] text-gray-400">Blind Shortlisted</span>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center">
                <span className="block text-2xl font-extrabold text-emerald-400">
                  {auditData.disparate_impact_summary?.disparate_impact_ratio || 1.0}
                </span>
                <span className="text-[11px] text-gray-400">Disparate Impact Ratio</span>
              </div>
            </div>

            {/* Blind Scores Table */}
            <div>
              <h3 className="text-sm font-bold text-gray-200 mb-3">Candidate Blind Score Comparison</h3>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">Standard Score</th>
                      <th className="p-3">Demographic-Blind Score</th>
                      <th className="p-3">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {Object.entries(auditData.blind_scores || {}).map(([name, scores]: [string, any], idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-3 font-semibold text-white">{name}</td>
                        <td className="p-3 text-indigo-300">{(scores.standard_score * 100).toFixed(1)}%</td>
                        <td className="p-3 text-purple-300">{(scores.blind_score * 100).toFixed(1)}%</td>
                        <td className={`p-3 font-medium ${scores.delta >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                          {scores.delta >= 0 ? `+${(scores.delta * 100).toFixed(1)}%` : `${(scores.delta * 100).toFixed(1)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Close Audit Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
