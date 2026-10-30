import { LogoMark } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="grid-backdrop absolute inset-0" />
      <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-brand/20 blur-[100px]" />
      <div className="relative">
        <LogoMark size={56} className="mx-auto" />
        <p className="mt-8 font-display text-7xl font-semibold text-gradient">404</p>
        <h1 className="mt-3 text-xl font-semibold text-ink">This page didn't make the shortlist</h1>
        <p className="mt-2 text-sm text-ink-muted">The page you're looking for doesn't exist or has moved.</p>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
          <ButtonLink href="/" variant="secondary">Home</ButtonLink>
        </div>
      </div>
    </div>
  );
}
