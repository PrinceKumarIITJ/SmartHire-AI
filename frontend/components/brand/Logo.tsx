import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * SmartHire mark: an "S" traced as an agent graph — two endpoint nodes joined by a
 * flowing path through a glowing core node — on an aurora (violet → aqua) tile.
 */
export function LogoMark({ size = 36, className, animated = false }: { size?: number; className?: string; animated?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="SmartHire"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={`${id}-tile`} x1="4" y1="2" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B6CFF" />
          <stop offset="0.55" stopColor="#5B3FF0" />
          <stop offset="1" stopColor="#14C8E6" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 6) rotate(55) scale(30)">
          <stop stopColor="white" stopOpacity="0.35" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      <rect x="1" y="1" width="38" height="38" rx="11" fill={`url(#${id}-tile)`} />
      <rect x="1" y="1" width="38" height="38" rx="11" fill={`url(#${id}-shine)`} />
      <rect x="1.5" y="1.5" width="37" height="37" rx="10.5" stroke="white" strokeOpacity="0.18" />

      {/* The S-shaped agent path */}
      <path
        d="M27 12.6c-1.3-1.9-3.9-3.1-7-3.1-4.2 0-7 2.2-7 5.3 0 3.4 3.3 4.5 7 5.2 3.7.7 7 1.8 7 5.2 0 3.1-2.8 5.3-7 5.3-3.1 0-5.7-1.2-7-3.1"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={animated ? "4 4" : undefined}
        className={animated ? "animate-flow-dash" : undefined}
      />

      {/* Endpoint nodes: the role and the hire */}
      <circle cx="27.2" cy="12.4" r="3.1" fill="white" />
      <circle cx="12.8" cy="27.6" r="3.1" fill="white" />
      <circle cx="27.2" cy="12.4" r="1.25" fill="#5B3FF0" />
      <circle cx="12.8" cy="27.6" r="1.25" fill="#14C8E6" />

      {/* Core node: the matching intelligence */}
      <circle cx="20" cy="20" r="3.2" fill="#7CF5FF" filter={`url(#${id}-glow)`} opacity="0.9" />
      <circle cx="20" cy="20" r="1.9" fill="white" />
    </svg>
  );
}

export function Logo({ className, compact = false, size = 34 }: { className?: string; compact?: boolean; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
            Smart<span className="text-gradient">Hire</span>
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">Recruiting AI</span>
        </span>
      )}
    </span>
  );
}
