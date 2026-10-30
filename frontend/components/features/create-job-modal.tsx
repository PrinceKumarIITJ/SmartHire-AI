"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Wand2 } from "lucide-react";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

const SAMPLE_JD = `We are hiring a Senior AI Engineer to design and ship LLM-powered products.

Responsibilities
- Build retrieval-augmented generation (RAG) pipelines and agentic workflows with LangChain / LangGraph
- Design and operate Python microservices with FastAPI
- Own evaluation, monitoring and prompt iteration for production LLM features
- Partner with product and design to scope AI features end to end

Requirements
- 4+ years of professional software engineering experience
- Strong Python, FastAPI, LangChain, vector databases (FAISS, pgvector or similar)
- Experience deploying with Docker and a major cloud provider
- Bachelor's degree in Computer Science or a related field

Nice to have
- Kubernetes, PyTorch, experience fine-tuning open models
- Prior work on recommendation or ranking systems`;

export function CreateJobModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ title: "", raw_jd: "", department: "", location: "", employment_type: "Full-time" });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const valid = form.title.trim().length >= 2 && form.raw_jd.trim().length >= 30;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    try {
      const job = await api.jobs.create({
        title: form.title.trim(),
        raw_jd: form.raw_jd,
        department: form.department || undefined,
        location: form.location || undefined,
        employment_type: form.employment_type || undefined,
      });
      toast.success("Job created", `The JD Agent extracted ${job.parsed_jd?.must_have_skills.length ?? 0} must-have skills.`);
      setForm({ title: "", raw_jd: "", department: "", location: "", employment_type: "Full-time" });
      onCreated?.();
      onClose();
      router.push(`/jobs/${job.id}/upload`);
    } catch (err) {
      toast.error("Couldn't create job", err instanceof Error ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<Sparkles className="h-5 w-5" />}
      title="Create a job"
      subtitle="Paste the description — the JD Agent turns it into structured, scoreable requirements."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button form="create-job" type="submit" loading={submitting} disabled={!valid}>
            {submitting ? "Analyzing with JD Agent…" : "Create & continue"}
          </Button>
        </>
      }
    >
      <form id="create-job" onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="title">Job title</Label>
          <input id="title" className="field" placeholder="e.g. Senior AI Engineer" value={form.title} onChange={set("title")} autoFocus required />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="dept" hint="Optional">Department</Label>
            <input id="dept" className="field" placeholder="Engineering" value={form.department} onChange={set("department")} />
          </div>
          <div>
            <Label htmlFor="loc" hint="Optional">Location</Label>
            <input id="loc" className="field" placeholder="Remote · Bengaluru" value={form.location} onChange={set("location")} />
          </div>
          <div>
            <Label htmlFor="type">Employment type</Label>
            <select id="type" className="field" value={form.employment_type} onChange={set("employment_type")}>
              {["Full-time", "Part-time", "Contract", "Internship"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="jd" className="text-xs font-medium text-ink-muted">Job description</label>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, title: f.title || "Senior AI Engineer", raw_jd: SAMPLE_JD, department: f.department || "Engineering" }))}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-soft hover:underline"
            >
              <Wand2 className="h-3 w-3" /> Use a sample
            </button>
          </div>
          <textarea
            id="jd"
            rows={12}
            className="field resize-y font-mono text-[13px] leading-relaxed"
            placeholder="Paste the full job description, including responsibilities and requirements…"
            value={form.raw_jd}
            onChange={set("raw_jd")}
            required
          />
          <p className="mt-1.5 text-[11px] text-ink-subtle">
            {form.raw_jd.trim().length < 30 ? `At least 30 characters (${form.raw_jd.trim().length}/30)` : `${form.raw_jd.trim().split(/\s+/).length} words`}
          </p>
        </div>
      </form>
    </Modal>
  );
}
