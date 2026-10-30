"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ClipboardCopy, MessagesSquare, RefreshCw, Wand2 } from "lucide-react";
import { api } from "@/lib/api";
import type { InterviewQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

const CATEGORY_TONE: Record<string, "brand" | "warning" | "info" | "success"> = {
  Technical: "brand",
  "Gap Probe": "warning",
  "Project Deep-Dive": "info",
  Behavioral: "success",
};

export function InterviewKit({ candidateId, candidateName }: { candidateId: string; candidateName: string }) {
  const toast = useToast();
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const kit = await api.candidates.interviewKit(candidateId, 8);
      setQuestions(kit.questions);
      setChecked(new Set());
    } catch (e) {
      toast.error("Couldn't generate interview kit", e instanceof Error ? e.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!questions) return;
    const text = [`Interview kit — ${candidateName}`, "", ...questions.map((q, i) => `${i + 1}. [${q.category}] ${q.question}\n   Listen for: ${q.rationale}`)].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  if (!questions && !loading) {
    return (
      <EmptyState
        icon={<MessagesSquare className="h-6 w-6" />}
        title="Generate a tailored interview kit"
        description={`The Interview Agent writes questions that verify ${candidateName.split(" ")[0]}'s strengths and probe each skill gap, with what to listen for.`}
        action={<Button onClick={generate}><Wand2 className="h-4 w-4" /> Generate questions</Button>}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-ink-muted">{questions ? `${checked.size}/${questions.length} covered` : "Drafting questions…"}</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={generate} loading={loading}><RefreshCw className="h-3.5 w-3.5" /> Regenerate</Button>
          <Button variant="secondary" size="sm" onClick={copy} disabled={!questions}>
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <ClipboardCopy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy kit"}
          </Button>
        </div>
      </div>
      {loading && !questions ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <ol className={cn("space-y-3", loading && "opacity-50")}>
          {questions!.map((q, i) => {
            const done = checked.has(i);
            return (
              <motion.li key={`${i}-${q.question}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={cn("flex gap-4 rounded-xl border p-4 transition-colors", done ? "border-success/25 bg-success/[0.04]" : "border-line bg-surface")}>
                <button
                  onClick={() => setChecked((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                  className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors", done ? "border-success bg-success text-white" : "border-line hover:border-brand")}
                  aria-label={done ? "Mark as not asked" : "Mark as asked"}
                >
                  {done && <Check className="h-3 w-3" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-xs font-semibold tabular-nums text-ink-subtle">Q{i + 1}</span>
                    <Badge tone={CATEGORY_TONE[q.category] ?? "neutral"}>{q.category}</Badge>
                  </div>
                  <p className={cn("text-sm font-medium text-ink", done && "text-ink-muted line-through decoration-ink-subtle/50")}>{q.question}</p>
                  {q.rationale && <p className="mt-1.5 text-xs text-ink-muted"><span className="text-ink-subtle">Listen for:</span> {q.rationale}</p>}
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
