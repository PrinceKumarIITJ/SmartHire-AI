"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Inbox, Mail, Save, Send } from "lucide-react";
import { api } from "@/lib/api";
import type { EmailDraft } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, Badge, EmptyState, Segmented } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

type Filter = "all" | "draft" | "approved" | "sent";

const STATUS_BADGE = {
  draft: { tone: "warning" as const, label: "Needs review" },
  approved: { tone: "brand" as const, label: "Approved" },
  sent: { tone: "success" as const, label: "Sent" },
};

/** Two-pane human-in-the-loop email review. Used inside the job modal and the Outbox page. */
export function EmailReview({ drafts, onChange, showJob = false, height = "h-[560px]" }: {
  drafts: EmailDraft[]; onChange: (d: EmailDraft) => void; showJob?: boolean; height?: string;
}) {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const visible = useMemo(() => drafts.filter((d) => filter === "all" || d.status === filter), [drafts, filter]);
  const selected = drafts.find((d) => d.id === selectedId) ?? visible[0];

  useEffect(() => {
    if (selected) { setSubject(selected.subject); setBody(selected.body); }
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = !!selected && (subject !== selected.subject || body !== selected.body);
  const counts = (s: Filter) => drafts.filter((d) => s === "all" || d.status === s).length;

  const save = async (status?: "approved") => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await api.emails.update(selected.id, { subject, body, ...(status ? { status } : {}) });
      onChange(updated);
      toast.success(status ? "Draft approved" : "Draft saved");
    } catch (e) {
      toast.error("Couldn't save", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    if (!selected) return;
    setSending(true);
    try {
      if (dirty) onChange(await api.emails.update(selected.id, { subject, body }));
      const res = await api.emails.send(selected.id);
      onChange({ ...selected, subject, body, status: "sent", sent_at: new Date().toISOString() });
      toast.success("Email sent", res.message);
    } catch (e) {
      toast.error("Couldn't send", e instanceof Error ? e.message : undefined);
    } finally {
      setSending(false);
    }
  };

  if (drafts.length === 0) {
    return <EmptyState icon={<Inbox className="h-6 w-6" />} title="No email drafts yet" description="Drafts are generated for every candidate when the pipeline runs." />;
  }

  const locked = selected?.status === "sent";

  return (
    <div className="space-y-4">
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All", count: counts("all") },
          { value: "draft", label: "Needs review", count: counts("draft") },
          { value: "approved", label: "Approved", count: counts("approved") },
          { value: "sent", label: "Sent", count: counts("sent") },
        ]}
      />
      <div className={cn("grid overflow-hidden rounded-2xl border border-line md:grid-cols-[300px_1fr]", height)}>
        <ul className="divide-y divide-line overflow-y-auto border-b border-line bg-elevated/30 md:border-b-0 md:border-r">
          {visible.length === 0 && <li className="p-6 text-center text-sm text-ink-subtle">Nothing here.</li>}
          {visible.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => setSelectedId(d.id)}
                className={cn("relative flex w-full gap-3 px-4 py-3.5 text-left transition-colors", selected?.id === d.id ? "bg-surface" : "hover:bg-surface/60")}
              >
                {selected?.id === d.id && <motion.span layoutId="email-active" className="absolute inset-y-0 left-0 w-0.5 bg-brand" />}
                <Avatar name={d.candidate_name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-ink">{d.candidate_name}</span>
                    <span className="shrink-0 text-[10px] text-ink-subtle">{timeAgo(d.sent_at ?? d.created_at)}</span>
                  </div>
                  <div className="truncate text-xs text-ink-muted">{d.subject}</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Badge tone={STATUS_BADGE[d.status].tone}>{STATUS_BADGE[d.status].label}</Badge>
                    <span className={cn("text-[10px] font-medium uppercase tracking-wider", d.type === "selection" ? "text-success" : "text-ink-subtle")}>{d.type}</span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>

        <AnimatePresence mode="wait">
          {selected && (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="flex min-h-0 flex-col bg-surface">
              <div className="space-y-3 border-b border-line p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <Mail className="h-3.5 w-3.5" />
                  To: <span className="font-medium text-ink">{selected.candidate_name}</span>
                  {selected.candidate_email ? <span>&lt;{selected.candidate_email}&gt;</span> : <Badge tone="danger">No email on resume</Badge>}
                  {showJob && selected.job_title && <span className="text-ink-subtle">· {selected.job_title}</span>}
                </div>
                <input value={subject} disabled={locked} onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-transparent text-base font-semibold text-ink focus:outline-none disabled:opacity-80" aria-label="Subject" />
              </div>
              <textarea value={body} disabled={locked} onChange={(e) => setBody(e.target.value)} aria-label="Email body"
                className="min-h-[220px] flex-1 resize-none bg-transparent p-5 text-sm leading-relaxed text-ink focus:outline-none disabled:opacity-80" />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-elevated/30 px-5 py-3">
                {locked ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Sent {selected.sent_at && timeAgo(selected.sent_at)}</span>
                ) : (
                  <span className="text-xs text-ink-subtle">{dirty ? "Unsaved changes" : "Review before sending — nothing goes out without approval."}</span>
                )}
                {!locked && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => save()} disabled={!dirty} loading={saving}><Save className="h-3.5 w-3.5" /> Save</Button>
                    {selected.status === "draft" && <Button variant="secondary" size="sm" onClick={() => save("approved")} loading={saving}>Approve</Button>}
                    <Button size="sm" onClick={send} loading={sending} disabled={!selected.candidate_email}><Send className="h-3.5 w-3.5" /> Approve & send</Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
