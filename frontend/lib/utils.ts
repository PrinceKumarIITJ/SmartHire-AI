import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MatchStatus, PoolStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const pct = (score: number | null | undefined, digits = 0) =>
  score === null || score === undefined ? "—" : `${(score * 100).toFixed(digits)}`;

export type Tone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

export function scoreTone(score: number): Tone {
  if (score >= 0.8) return "success";
  if (score >= 0.7) return "brand";
  if (score >= 0.55) return "warning";
  return "danger";
}

export function scoreLabel(score: number): string {
  if (score >= 0.85) return "Exceptional";
  if (score >= 0.7) return "Strong";
  if (score >= 0.55) return "Moderate";
  return "Weak";
}

export const STATUS_TONE: Record<PoolStatus, Tone> = {
  Shortlisted: "success",
  Interview: "brand",
  Pending: "warning",
  Rejected: "danger",
  Unprocessed: "neutral",
};

export const MATCH_STATUSES: MatchStatus[] = ["Shortlisted", "Interview", "Pending", "Rejected"];

export function initials(name: string) {
  return name
    .replace(/\.(pdf|docx|txt)$/i, "")
    .split(/[\s_\-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Backend timestamps are naive UTC; treat them as UTC. */
export function parseDate(iso: string) {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - parseDate(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  const units: [number, string][] = [[60, "m"], [3600, "h"], [86400, "d"], [604800, "w"]];
  for (let i = units.length - 1; i >= 0; i--) {
    const [secs, label] = units[i];
    if (diff >= secs) return `${Math.floor(diff / secs)}${label} ago`;
  }
  return "just now";
}

export function formatDate(iso: string) {
  return parseDate(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Deterministic hue for avatar backgrounds so a candidate keeps their color. */
export function hashHue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}
