"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* Shared chart scaffolding ------------------------------------------------- */

function Tooltip({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-xl"
      style={style}
    >
      {children}
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
  );
}

/** "View as table" toggle so no value is gated behind hover or color. */
export function TableToggle({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-subtle hover:text-ink">
        <Table2 className="h-3.5 w-3.5" /> {open ? "Hide table" : "View as table"}
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <thead className="bg-elevated/60 text-ink-muted">
              <tr>{headers.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} className={cn("px-3 py-1.5 text-ink", j > 0 && "tabular-nums")}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* Column chart (single series) -------------------------------------------- */

export function ColumnChart({ data, height = 180, valueLabel = "Candidates" }: {
  data: { label: string; count: number }[]; height?: number; valueLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const ticks = [0, Math.ceil(max / 2), max];

  return (
    <div>
      <div className="relative flex" style={{ height }}>
        {/* y-axis ticks */}
        <div className="relative mr-2 w-6 text-right text-[10px] tabular-nums text-ink-subtle">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / max) * 100}%` }}>{t}</span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 h-px" style={{ top: `${100 - (t / max) * 100}%`, background: "var(--viz-grid)" }} />
          ))}
          <div className="absolute inset-0 flex items-end justify-around gap-2">
            {data.map((d, i) => {
              const h = (d.count / max) * 100;
              return (
                <div
                  key={d.label}
                  className="relative flex h-full flex-1 cursor-default items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  {hover === i && (
                    <div className="absolute inset-y-0 left-1/2 w-10 -translate-x-1/2 rounded-md bg-ink/[0.04]" />
                  )}
                  <div className="relative flex w-full max-w-[24px] flex-col items-center justify-end" style={{ height: `${h}%` }}>
                    {d.count > 0 && (
                      <span className="absolute -top-5 text-[11px] font-medium tabular-nums text-ink">{d.count}</span>
                    )}
                    <motion.div
                      className="w-full rounded-t-[4px]"
                      style={{ background: "var(--viz-1)", opacity: hover === null || hover === i ? 1 : 0.55 }}
                      initial={{ height: 0 }}
                      whileInView={{ height: "100%" }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  {hover === i && (
                    <Tooltip style={{ left: "50%", top: `${100 - h}%`, marginTop: -24 }}>
                      <div className="font-medium text-ink">Score {d.label}</div>
                      <div className="text-ink-muted">{d.count} {valueLabel.toLowerCase()}</div>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ml-8 mt-2 flex justify-around text-[10px] text-ink-subtle">
        {data.map((d) => <span key={d.label} className="flex-1 text-center tabular-nums">{d.label}</span>)}
      </div>
      <TableToggle headers={["Score band", valueLabel]} rows={data.map((d) => [d.label, d.count])} />
    </div>
  );
}

/* Stacked horizontal bars: matched vs missing per skill --------------------- */

export function SkillDemandChart({ data }: { data: { skill: string; matched: number; missing: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.matched + d.missing));

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <LegendKey color="var(--viz-1)" label="Candidates with skill" />
        <LegendKey color="var(--viz-2)" label="Candidates missing skill" />
      </div>
      <div className="space-y-2.5">
        {data.map((d, i) => {
          const total = d.matched + d.missing;
          return (
            <div
              key={d.skill}
              className="relative grid grid-cols-[110px_1fr_32px] items-center gap-3 rounded-md py-0.5"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="truncate text-xs text-ink-muted" title={d.skill}>{d.skill}</span>
              <div className="relative h-3">
                <motion.div
                  className="flex h-full gap-[2px]"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(total / max) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  {d.matched > 0 && (
                    <div className={cn("h-full", d.missing > 0 ? "rounded-l-[4px]" : "rounded-[4px] rounded-l-[4px]")}
                      style={{ flex: d.matched, background: "var(--viz-1)", borderTopRightRadius: d.missing ? 0 : 4, borderBottomRightRadius: d.missing ? 0 : 4 }} />
                  )}
                  {d.missing > 0 && (
                    <div className="h-full rounded-r-[4px]" style={{ flex: d.missing, background: "var(--viz-2)", borderTopLeftRadius: d.matched ? 0 : 4, borderBottomLeftRadius: d.matched ? 0 : 4 }} />
                  )}
                </motion.div>
                {hover === i && (
                  <Tooltip style={{ left: `${Math.min(80, (total / max) * 50)}%`, top: -6 }}>
                    <div className="mb-1 font-medium text-ink">{d.skill}</div>
                    <div className="flex items-center gap-1.5 text-ink-muted"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--viz-1)" }} />Has skill: <span className="tabular-nums text-ink">{d.matched}</span></div>
                    <div className="flex items-center gap-1.5 text-ink-muted"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--viz-2)" }} />Missing: <span className="tabular-nums text-ink">{d.missing}</span></div>
                  </Tooltip>
                )}
              </div>
              <span className="text-right text-xs tabular-nums text-ink">{total}</span>
            </div>
          );
        })}
      </div>
      <TableToggle headers={["Skill", "Has skill", "Missing"]} rows={data.map((d) => [d.skill, d.matched, d.missing])} />
    </div>
  );
}

/* Dot plot: standard vs demographic-blind score per candidate --------------- */

export function BlindScoreDotPlot({ data }: { data: { name: string; standard: number; blind: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--viz-1)" }} /> Standard score
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--viz-2)" }} /> Blind score
        </span>
      </div>
      <div className="space-y-1">
        {data.map((d, i) => {
          const lo = Math.min(d.standard, d.blind) * 100;
          const hi = Math.max(d.standard, d.blind) * 100;
          return (
            <div
              key={d.name}
              className={cn("grid grid-cols-[120px_1fr] items-center gap-3 rounded-md px-1 py-1.5", hover === i && "bg-ink/[0.03]")}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="truncate text-xs text-ink-muted" title={d.name}>{d.name}</span>
              <div className="relative h-4">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: "var(--viz-grid)" }} />
                <div className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-ink-subtle/50" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
                {[["standard", "var(--viz-1)"], ["blind", "var(--viz-2)"]].map(([k, color]) => (
                  <span
                    key={k}
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ left: `${(d[k as "standard" | "blind"]) * 100}%`, background: color, boxShadow: "0 0 0 2px rgb(var(--surface))" }}
                  />
                ))}
                {hover === i && (
                  <Tooltip style={{ left: `${hi}%`, top: -4 }}>
                    <div className="mb-1 font-medium text-ink">{d.name}</div>
                    <div className="text-ink-muted">Standard <span className="tabular-nums text-ink">{(d.standard * 100).toFixed(1)}</span></div>
                    <div className="text-ink-muted">Blind <span className="tabular-nums text-ink">{(d.blind * 100).toFixed(1)}</span></div>
                    <div className="text-ink-muted">Shift <span className="tabular-nums text-ink">{((d.blind - d.standard) * 100).toFixed(1)}</span></div>
                  </Tooltip>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="ml-[132px] mt-1 flex justify-between text-[10px] tabular-nums text-ink-subtle">
        <span>0</span><span>50</span><span>100</span>
      </div>
      <TableToggle
        headers={["Candidate", "Standard", "Blind", "Shift"]}
        rows={data.map((d) => [d.name, (d.standard * 100).toFixed(1), (d.blind * 100).toFixed(1), ((d.blind - d.standard) * 100).toFixed(1)])}
      />
    </div>
  );
}

/* Radar of the five XAI sub-scores (single series) ------------------------- */

export function ScoreRadar({ scores, size = 240 }: { scores: { label: string; value: number }[]; size?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 38;
  const n = scores.length;
  const point = (i: number, v: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * radius * v, cy + Math.sin(angle) * radius * v] as const;
  };
  const polygon = scores.map((s, i) => point(i, Math.max(0.02, s.value)).join(",")).join(" ");

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`Score breakdown: ${scores.map((s) => `${s.label} ${Math.round(s.value * 100)}`).join(", ")}`}>
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon key={r} points={scores.map((_, i) => point(i, r).join(",")).join(" ")} fill="none" style={{ stroke: "var(--viz-grid)" }} strokeWidth={1} />
        ))}
        {scores.map((_, i) => {
          const [x, y] = point(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} style={{ stroke: "var(--viz-grid)" }} strokeWidth={1} />;
        })}
        <motion.polygon
          points={polygon}
          style={{ fill: "var(--viz-1)", stroke: "var(--viz-1)", transformOrigin: `${cx}px ${cy}px` }}
          fillOpacity={0.14}
          strokeWidth={2}
          strokeLinejoin="round"
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        {scores.map((s, i) => {
          const [x, y] = point(i, Math.max(0.02, s.value));
          return (
            <g key={s.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="cursor-default">
              <circle cx={x} cy={y} r={12} fill="transparent" />
              <circle cx={x} cy={y} r={4.5} style={{ fill: "var(--viz-1)", stroke: "rgb(var(--surface))" }} strokeWidth={2} />
            </g>
          );
        })}
        {scores.map((s, i) => {
          const [x, y] = point(i, 1.22);
          return (
            <text key={s.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-ink-muted text-[10px]">
              {s.label}
            </text>
          );
        })}
      </svg>
      {hover !== null && (() => {
        const [x, y] = point(hover, scores[hover].value);
        return (
          <Tooltip style={{ left: x, top: y - 10 }}>
            <span className="text-ink-muted">{scores[hover].label}</span>{" "}
            <span className="font-medium tabular-nums text-ink">{Math.round(scores[hover].value * 100)}</span>
          </Tooltip>
        );
      })()}
    </div>
  );
}
