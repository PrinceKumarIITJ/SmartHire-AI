"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Mail, Send, CheckCircle2, RefreshCw, Edit3 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface EmailDraftModalProps {
  jobId: string;
  candidateId?: string;
  onClose: () => void;
}

export default function EmailDraftModal({ jobId, candidateId, onClose }: EmailDraftModalProps) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState("");

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/email-drafts/jobs/${jobId}`);
      setDrafts(res.data);
      if (res.data.length > 0) {
        const target = candidateId
          ? res.data.find((d: any) => d.candidate_id === candidateId) || res.data[0]
          : res.data[0];
        setSelectedDraft(target);
        setSubject(target.subject);
        setBody(target.body);
      }
    } catch (err) {
      console.error("Failed to fetch email drafts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [jobId, candidateId]);

  const handleSelectDraft = (draft: any) => {
    setSelectedDraft(draft);
    setSubject(draft.subject);
    setBody(draft.body);
    setSendSuccess("");
  };

  const handleSaveEdit = async () => {
    if (!selectedDraft) return;
    try {
      const res = await axios.patch(`${API_BASE}/email-drafts/${selectedDraft.id}`, {
        subject,
        body,
      });
      setSelectedDraft(res.data);
      alert("Email draft updated successfully.");
    } catch (err) {
      console.error("Failed to save draft edit", err);
    }
  };

  const handleApproveAndSend = async () => {
    if (!selectedDraft) return;
    try {
      setSending(true);
      setSendSuccess("");
      await axios.patch(`${API_BASE}/email-drafts/${selectedDraft.id}`, {
        subject,
        body,
        status: "approved",
      });
      const res = await axios.post(`${API_BASE}/email-drafts/${selectedDraft.id}/send`);
      setSendSuccess(res.data.message || "Email dispatched successfully!");
      setSelectedDraft({ ...selectedDraft, status: "sent" });
    } catch (err: any) {
      console.error("Failed to send email", err);
      alert(err.response?.data?.detail || "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl glass-panel p-6 space-y-6 border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Human-in-the-Loop Email Drafts</h2>
              <p className="text-xs text-gray-400">Review, Edit & Approve Skills-Grounded Rejection/Selection Emails</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-bold">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No email drafts generated yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Drafts List Sidebar */}
            <div className="space-y-2 border-r border-white/10 pr-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Candidate Drafts</h3>
              {drafts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleSelectDraft(d)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                    selectedDraft?.id === d.id
                      ? "bg-indigo-600/20 border-indigo-500/40 text-white"
                      : "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5"
                  }`}
                >
                  <div className="font-semibold truncate">{d.candidate_name}</div>
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className={d.type === "selection" ? "text-emerald-400" : "text-amber-400"}>
                      {d.type.toUpperCase()}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${d.status === "sent" ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-700 text-gray-300"}`}>
                      {d.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Email Editor Panel */}
            <div className="md:col-span-2 space-y-4">
              {sendSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {sendSuccess}
                </div>
              )}

              {selectedDraft && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      Email Body (Skills-Grounded & Editable)
                    </label>
                    <textarea
                      rows={10}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-gray-200 text-xs leading-relaxed font-sans focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <button
                      onClick={handleSaveEdit}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold border border-white/10"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Save Edits
                    </button>

                    <button
                      onClick={handleApproveAndSend}
                      disabled={sending || selectedDraft.status === "sent"}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-colors"
                    >
                      {sending ? (
                        "Dispatching..."
                      ) : selectedDraft.status === "sent" ? (
                        "Sent Already"
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Approve & Send Email
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
