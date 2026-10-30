"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn, hashHue, initials, type Tone } from "@/lib/utils";
import { Button } from "./button";

export function Card({ className, hover, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div className={cn("card", hover && "card-hover", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon, action, className }: {
  title: React.ReactNode; subtitle?: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-5", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-soft">{icon}</div>}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const BADGE_TONES: Record<Tone, string> = {
  brand: "bg-brand/10 text-brand-soft ring-brand/25",
  success: "bg-success/10 text-success ring-success/25",
  warning: "bg-warning/10 text-warning ring-warning/25",
  danger: "bg-danger/10 text-danger ring-danger/25",
  info: "bg-info/10 text-info ring-info/25",
  neutral: "bg-elevated text-ink-muted ring-line",
};

export function Badge({ tone = "neutral", dot, className, children }: {
  tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", BADGE_TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function SkillChip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "match" | "miss" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        tone === "match" && "bg-success/10 text-success ring-success/20",
        tone === "miss" && "bg-danger/[0.07] text-danger ring-danger/20 line-through decoration-danger/40",
        tone === "neutral" && "bg-elevated text-ink-muted ring-line"
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-elevated", className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-ink/[0.05] to-transparent" />
    </div>
  );
}

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const hue = hashHue(name);
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-surface", className)}
      style={{
        width: size, height: size, fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 40) % 360} 75% 45%))`,
      }}
      aria-hidden
    >
      {initials(name) || "?"}
    </span>
  );
}

export function EmptyState({ icon, title, description, action, className }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-14 text-center", className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-2xl bg-brand/20 blur-xl" />
        <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-line bg-surface text-brand-soft">{icon}</div>
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-danger/25 bg-danger/[0.05] px-6 py-10 text-center">
      <AlertTriangle className="h-6 w-6 text-danger" />
      <p className="max-w-lg text-sm text-ink">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions, children }: {
  eyebrow?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-xs font-medium text-ink-subtle">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold text-ink md:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Label({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-muted">
      <span>{children}</span>
      {hint && <span className="font-normal text-ink-subtle">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: {
  value: T; onChange: (v: NoInfer<T>) => void; options: { value: NoInfer<T>; label: React.ReactNode; count?: number }[]; className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-xl border border-line bg-elevated/60 p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
            value === o.value ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink"
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cn("rounded-md px-1.5 text-[10px] tabular-nums", value === o.value ? "bg-brand/10 text-brand-soft" : "bg-line/60")}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
