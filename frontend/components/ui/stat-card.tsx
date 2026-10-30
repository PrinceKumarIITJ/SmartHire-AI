"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./score";

export function StatCard({ label, value, decimals = 0, suffix, icon, hint, accent = "brand", index = 0 }: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  icon: React.ReactNode;
  hint?: React.ReactNode;
  accent?: "brand" | "aqua" | "success" | "warning";
  index?: number;
}) {
  const accentCls = {
    brand: "text-brand-soft bg-brand/10",
    aqua: "text-aqua bg-aqua/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="card group relative overflow-hidden p-5"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-muted">{label}</span>
        <span className={cn("grid h-8 w-8 place-items-center rounded-lg", accentCls)}>{icon}</span>
      </div>
      <div className="mt-3 font-display text-[28px] font-semibold leading-none text-ink">
        <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
      </div>
      {hint && <div className="mt-2 text-xs text-ink-subtle">{hint}</div>}
    </motion.div>
  );
}
