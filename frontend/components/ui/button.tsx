import { forwardRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-fg shadow-[0_1px_0_0_rgb(255_255_255/0.2)_inset,0_6px_20px_-6px_rgb(var(--brand)/0.7)] hover:bg-brand-strong hover:shadow-[0_1px_0_0_rgb(255_255_255/0.2)_inset,0_10px_28px_-6px_rgb(var(--brand)/0.8)]",
  secondary: "bg-elevated text-ink border border-line hover:border-ink-subtle/50 hover:bg-line/40",
  outline: "border border-line text-ink hover:border-brand/50 hover:text-brand",
  ghost: "text-ink-muted hover:text-ink hover:bg-elevated",
  danger: "bg-danger/10 text-danger border border-danger/25 hover:bg-danger/15",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-lg justify-center",
};

interface Common {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const base =
  "inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none";

export const Button = forwardRef<HTMLButtonElement, Common & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ variant = "primary", size = "md", loading, className, children, disabled, ...props }, ref) => (
    <button ref={ref} className={cn(base, VARIANTS[variant], SIZES[size], className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export function ButtonLink({
  href, variant = "primary", size = "md", className, children, ...props
}: Common & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={cn(base, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </Link>
  );
}
