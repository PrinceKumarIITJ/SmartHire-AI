"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, ChevronDown, FileText, Send, Sparkles, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface Msg {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  chunks?: string[];
}

const SUGGESTIONS = [
  "Summarize this candidate in 3 bullet points",
  "What production experience do they have?",
  "Which projects are most relevant to this role?",
  "Any gaps or red flags I should probe?",
];

function Citations({ citations, chunks }: { citations: string[]; chunks?: string[] }) {
  const [open, setOpen] = useState(false);
  if (!citations.length) return null;
  return (
    <div className="mt-2">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-subtle hover:text-ink">
        <FileText className="h-3 w-3" /> {citations.length} source{citations.length > 1 ? "s" : ""}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-2 space-y-1.5 overflow-hidden">
            {citations.map((c, i) => (
              <li key={i} className="rounded-lg border border-line bg-canvas/60 p-2.5 text-[11px]">
                <div className="mb-1 font-medium text-brand-soft">{c}</div>
                {chunks?.[i] && <p className="line-clamp-4 text-ink-muted">{chunks[i]}</p>}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CandidateChat({ candidateId, candidateName }: { candidateId: string; candidateName: string }) {
  const toast = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.candidates.chatHistory(candidateId)
      .then((h) => setMessages(h.map((m) => ({ role: m.role, content: m.message }))))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [candidateId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setSending(true);
    try {
      const res = await api.candidates.chat(candidateId, q);
      setMessages((m) => [...m, { role: "assistant", content: res.answer, citations: res.citations, chunks: res.chunks_used }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setSending(false);
    }
  };

  const clear = async () => {
    try { await api.candidates.clearChat(candidateId); setMessages([]); }
    catch { toast.error("Couldn't clear chat"); }
  };

  return (
    <div className="card flex h-[640px] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white"><Bot className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">Ask about this resume <Sparkles className="h-3.5 w-3.5 text-brand-soft" /></h3>
          <p className="truncate text-[11px] text-ink-subtle">RAG over {candidateName}'s resume · answers cite their sources</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={clear} aria-label="Clear conversation"><Trash2 className="h-3.5 w-3.5" /></Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {loaded && messages.length === 0 && (
          <div className="flex h-full flex-col justify-end">
            <p className="mb-3 text-xs text-ink-subtle">Try asking:</p>
            <div className="space-y-2">
              {SUGGESTIONS.map((s, i) => (
                <motion.button key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => ask(s)}
                  className="block w-full rounded-xl border border-line bg-elevated/40 px-3.5 py-2.5 text-left text-xs text-ink-muted transition-colors hover:border-brand/40 hover:text-ink">
                  {s}
                </motion.button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
              m.role === "user" ? "rounded-br-md bg-brand text-brand-fg" : "rounded-bl-md border border-line bg-elevated/50 text-ink"
            )}>
              {m.content}
              {m.citations && <Citations citations={m.citations} chunks={m.chunks} />}
            </div>
          </motion.div>
        ))}
        {sending && (
          <div className="flex items-center gap-1.5 px-1">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-brand-soft" animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
            ))}
            <span className="ml-1 text-[11px] text-ink-subtle">Searching resume…</span>
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex items-center gap-2 border-t border-line p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Ask about ${candidateName.split(" ")[0]}'s experience…`}
          className="field h-10 flex-1 py-0" maxLength={2000} />
        <Button type="submit" size="icon" className="h-10 w-10" disabled={!input.trim() || sending} aria-label="Send"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
