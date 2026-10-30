"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { api } from "@/lib/api";
import type { Health } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import { NAV_ITEMS, SECONDARY_NAV } from "./nav";
import { ThemeToggle } from "./theme";

function NavLink({ href, label, icon: Icon, collapsed, onClick, badge }: {
  href: string; label: string; icon: React.ElementType; collapsed?: boolean; onClick?: () => void; badge?: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "text-ink" : "text-ink-muted hover:bg-elevated hover:text-ink",
        collapsed && "justify-center px-0"
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-xl border border-brand/25 bg-brand/10"
          transition={{ type: "spring", damping: 30, stiffness: 380 }}
        />
      )}
      <Icon className={cn("relative h-[18px] w-[18px] shrink-0", active ? "text-brand-soft" : "text-ink-subtle group-hover:text-ink-muted")} />
      {!collapsed && <span className="relative truncate">{label}</span>}
      {!collapsed && badge && (
        <span className="relative ml-auto rounded-md bg-brand-gradient px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">{badge}</span>
      )}
    </Link>
  );
}

function HealthPill({ collapsed }: { collapsed?: boolean }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [down, setDown] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = () =>
      api.health()
        .then((h) => { if (alive) { setHealth(h); setDown(false); } })
        .catch(() => alive && setDown(true));
    check();
    const t = setInterval(check, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const ok = !down && health?.status === "ok" && health.llm_providers.length > 0;
  const label = down ? "API offline" : !health ? "Connecting…" : health.llm_providers.length === 0 ? "No LLM key" : `${health.llm_providers.join(" + ")} online`;

  return (
    <Link
      href="/settings"
      className={cn("flex items-center gap-2.5 rounded-xl border border-line bg-elevated/50 px-3 py-2.5 text-xs text-ink-muted hover:text-ink", collapsed && "justify-center px-0")}
      title={label}
    >
      <span className="relative flex h-2 w-2">
        {ok && <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success" />}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", ok ? "bg-success" : down ? "bg-danger" : "bg-warning")} />
      </span>
      {!collapsed && <span className="truncate capitalize">{label}</span>}
    </Link>
  );
}

function SidebarContent({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <>
      <div className={cn("flex h-16 items-center px-4", collapsed && "justify-center px-0")}>
        <Link href="/" onClick={onNavigate} aria-label="SmartHire home">
          {collapsed ? <LogoMark size={32} /> : <Logo size={32} />}
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {!collapsed && <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">Workspace</div>}
        {NAV_ITEMS.map((n) => <NavLink key={n.href} {...n} collapsed={collapsed} onClick={onNavigate} />)}
      </nav>
      <div className="space-y-2 px-3 pb-4">
        {SECONDARY_NAV.map((n) => <NavLink key={n.href} {...n} collapsed={collapsed} onClick={onNavigate} />)}
        <HealthPill collapsed={collapsed} />
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("smarthire-sidebar") === "collapsed"); } catch { /* ignore */ }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem("smarthire-sidebar", c ? "expanded" : "collapsed"); } catch { /* ignore */ }
      return !c;
    });
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface/70 backdrop-blur-xl transition-[width] duration-300 lg:flex",
          collapsed ? "w-[76px]" : "w-[248px]"
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[120] lg:hidden">
            <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-[270px] flex-col border-r border-line bg-surface"
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
            >
              <button className="absolute right-3 top-4 rounded-lg p-2 text-ink-muted" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-4 w-4" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-canvas/75 px-4 backdrop-blur-xl md:px-8">
          <button className="rounded-lg p-2 text-ink-muted hover:bg-elevated lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <button
            className="hidden rounded-lg p-2 text-ink-subtle transition-colors hover:bg-elevated hover:text-ink lg:block"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-line bg-surface/70 px-3.5 text-sm text-ink-subtle transition-colors hover:border-brand/40"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 truncate text-left">Search jobs, candidates, actions…</span>
            <span className="hidden items-center gap-1 sm:flex"><span className="kbd">⌘</span><span className="kbd">K</span></span>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        <main className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand/[0.06] to-transparent" />
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-[1400px] px-4 py-8 md:px-8"
          >
            {children}
          </motion.div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
    </div>
  );
}
