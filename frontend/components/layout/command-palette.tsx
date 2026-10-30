"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, CornerDownLeft, Moon, Plus, Search, User } from "lucide-react";
import { api } from "@/lib/api";
import type { Job, TalentPoolItem } from "@/lib/types";
import { useHotkey } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";
import { useTheme } from "./theme";

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const router = useRouter();
  const { toggle } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [people, setPeople] = useState<TalentPoolItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useHotkey("k", (e) => { e.preventDefault(); setOpen(!open); }, { meta: true });

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 20);
    api.jobs.list().then(setJobs).catch(() => {});
    api.candidates.pool({}).then(setPeople).catch(() => {});
  }, [open]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (s: string) => !q || s.toLowerCase().includes(q);
    const out: Item[] = [
      { id: "new-job", group: "Actions", label: "Create a new job", icon: <Plus className="h-4 w-4" />, run: () => go("/jobs?new=1") },
      { id: "theme", group: "Actions", label: "Toggle light / dark theme", icon: <Moon className="h-4 w-4" />, run: () => { toggle(); setOpen(false); } },
      ...NAV_ITEMS.map((n) => ({ id: n.href, group: "Navigate", label: n.label, icon: <n.icon className="h-4 w-4" />, run: () => go(n.href) })),
      ...jobs.slice(0, 30).map((j) => ({
        id: j.id, group: "Jobs", label: j.title, hint: `${j.stats.candidate_count} candidates`,
        icon: <Briefcase className="h-4 w-4" />, run: () => go(`/jobs/${j.id}/results`),
      })),
      ...people.slice(0, 50).map((p) => ({
        id: p.candidate_id, group: "Candidates", label: p.name, hint: p.job_title,
        icon: <User className="h-4 w-4" />, run: () => go(`/candidates/${p.candidate_id}`),
      })),
    ];
    return out.filter((i) => match(`${i.label} ${i.hint ?? ""}`)).slice(0, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, jobs, people]);

  useEffect(() => setActive(0), [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    if (e.key === "Enter") { e.preventDefault(); items[active]?.run(); }
    if (e.key === "Escape") setOpen(false);
  };

  let lastGroup = "";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-[rgb(5_6_14/0.55)] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 text-ink-subtle" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search jobs, candidates, or actions…"
                className="h-14 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-subtle focus:outline-none"
              />
              <span className="kbd">ESC</span>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {items.length === 0 && <p className="px-3 py-8 text-center text-sm text-ink-subtle">No results for “{query}”</p>}
              {items.map((item, idx) => {
                const header = item.group !== lastGroup ? item.group : null;
                lastGroup = item.group;
                return (
                  <div key={`${item.group}-${item.id}`}>
                    {header && <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">{header}</div>}
                    <button
                      onMouseEnter={() => setActive(idx)}
                      onClick={item.run}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        idx === active ? "bg-brand/10 text-ink" : "text-ink-muted"
                      )}
                    >
                      <span className={cn(idx === active ? "text-brand-soft" : "text-ink-subtle")}>{item.icon}</span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.hint && <span className="truncate text-xs text-ink-subtle">{item.hint}</span>}
                      {idx === active && <CornerDownLeft className="h-3.5 w-3.5 text-ink-subtle" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
