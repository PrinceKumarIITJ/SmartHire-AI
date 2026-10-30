"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import type { MatchStatus } from "@/lib/types";
import { cn, MATCH_STATUSES, STATUS_TONE } from "@/lib/utils";

const DOT: Record<string, string> = {
  success: "bg-success", brand: "bg-brand", warning: "bg-warning", danger: "bg-danger", neutral: "bg-ink-subtle",
};
const TEXT: Record<string, string> = {
  success: "text-success", brand: "text-brand-soft", warning: "text-warning", danger: "text-danger", neutral: "text-ink-muted",
};

/** Recruiter override of the AI's recommendation. */
export function StatusSelect({ value, onChange, disabled }: { value: MatchStatus; onChange: (s: MatchStatus) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const tone = STATUS_TONE[value];
  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-xs font-medium transition-colors hover:border-ink-subtle/50",
          TEXT[tone]
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", DOT[tone])} />
        {value}
        <ChevronDown className="h-3 w-3 text-ink-subtle" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-9 z-30 w-40 rounded-xl border border-line bg-surface p-1 shadow-xl"
          >
            {MATCH_STATUSES.map((s) => (
              <li key={s}>
                <button
                  role="option"
                  aria-selected={s === value}
                  onClick={() => { setOpen(false); if (s !== value) onChange(s); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-ink hover:bg-elevated"
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", DOT[STATUS_TONE[s]])} />
                  <span className="flex-1 text-left">{s}</span>
                  {s === value && <Check className="h-3.5 w-3.5 text-brand-soft" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
