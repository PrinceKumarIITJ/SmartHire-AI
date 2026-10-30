"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";
import { cn, scoreTone } from "@/lib/utils";

const TONE_STROKE: Record<string, string> = {
  success: "rgb(var(--success))",
  brand: "rgb(var(--brand))",
  warning: "rgb(var(--warning))",
  danger: "rgb(var(--danger))",
};

/** Circular gauge for a 0–1 score. Animates on first view. */
export function ScoreRing({ score, size = 56, stroke = 5, label, className }: {
  score: number; size?: number; stroke?: number; label?: string; className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(var(--line))" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={TONE_STROKE[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c * (1 - Math.min(1, Math.max(0, score))) }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <span className="font-display font-semibold tabular-nums text-ink" style={{ fontSize: size * 0.28 }}>
          {Math.round(score * 100)}
        </span>
        {label && <span className="-mt-1 text-[9px] uppercase tracking-wider text-ink-subtle">{label}</span>}
      </div>
    </div>
  );
}

/** Horizontal sub-score bar with label and value; text stays in ink tokens. */
export function ScoreBar({ label, score, weight }: { label: string; score: number; weight?: string }) {
  const tone = scoreTone(score);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="text-ink-muted">
          {label} {weight && <span className="text-ink-subtle">· {weight}</span>}
        </span>
        <span className="font-medium tabular-nums text-ink">{Math.round(score * 100)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line/70">
        <motion.div
          className="h-full rounded-full"
          style={{ background: TONE_STROKE[tone] }}
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.round(score * 100)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

/** Number that counts up from 0 the first time it scrolls into view. */
export function AnimatedNumber({ value, decimals = 0, suffix = "", className }: {
  value: number; decimals?: number; suffix?: string; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
