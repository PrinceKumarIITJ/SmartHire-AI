"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { UploadCloud, FileText, Play, CheckCircle2, ArrowLeft, Cpu, AlertCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function UploadPage() {
  const { id } = useParams();
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndRun = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one resume file.");
      return;
    }

    try {
      setError("");
      setUploading(true);
      setStatusMessage("Uploading and extracting candidate resume text...");

      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      await axios.post(`${API_BASE}/jobs/${id}/resumes`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploading(false);
      setRunningPipeline(true);
      setStatusMessage("Executing 7 LangGraph Multi-Agents (JD, Resume, Matching, FAISS Indexing, Bias Audit, Report, Email)...");

      await axios.post(`${API_BASE}/jobs/${id}/run`);

      setStatusMessage("Pipeline execution complete! Redirecting to Ranked Leaderboard...");
      setTimeout(() => {
        router.push(`/jobs/${id}/results`);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "An error occurred during upload or pipeline execution.");
      setUploading(false);
      setRunningPipeline(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Navigation & Header */}
      <div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Link>
        <h1 className="text-3xl font-extrabold text-white">Upload Candidate Resumes</h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload PDF or Word resume files. The Multi-Agent pipeline will parse structured profiles, generate Explainable AI scores, index vector embeddings in FAISS, and audit bias.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Dropzone Card */}
      <div className="p-8 rounded-2xl glass-panel border border-dashed border-gray-700 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center mx-auto">
          <UploadCloud className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Drag & Drop Resume Files Here</h3>
          <p className="text-gray-400 text-xs mt-1">Supports PDF, DOCX, or TXT formats (multiple files supported)</p>
        </div>

        <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 cursor-pointer transition-colors">
          Browse Files
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="p-6 rounded-2xl glass-card space-y-4">
          <h3 className="text-sm font-bold text-gray-200 flex items-center justify-between">
            Selected Resumes ({selectedFiles.length})
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-red-400 hover:underline font-normal"
            >
              Clear All
            </button>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5 text-xs"
              >
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span className="text-gray-200 truncate">{file.name}</span>
                </div>
                <button
                  onClick={() => handleRemoveFile(idx)}
                  className="text-gray-500 hover:text-red-400 text-sm font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-end">
            <button
              onClick={handleUploadAndRun}
              disabled={uploading || runningPipeline}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 hover:opacity-95 disabled:opacity-50 transition-all"
            >
              {uploading || runningPipeline ? (
                <>
                  <Cpu className="w-4 h-4 animate-spin" />
                  Processing Pipeline...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Multi-Agent Pipeline
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Progress Overlay */}
      {(uploading || runningPipeline) && (
        <div className="p-6 rounded-2xl glass-panel border border-indigo-500/30 flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 animate-pulse">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">LangGraph Multi-Agent Orchestration</h4>
            <p className="text-xs text-indigo-300 mt-0.5">{statusMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
