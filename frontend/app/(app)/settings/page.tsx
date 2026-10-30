"use client";

import { CheckCircle2, Cpu, Database, Mail, Monitor, Moon, Server, Sun, XCircle } from "lucide-react";
import { API_BASE, api } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, ErrorState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { useTheme } from "@/components/layout/theme";

function Row({ label, value, ok, hint }: { label: string; value: React.ReactNode; ok?: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <div className="text-sm text-ink">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-ink-subtle">{hint}</div>}
      </div>
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        {value}
        {ok !== undefined && (ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-danger" />)}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const health = useQuery(() => api.health(), []);
  const { theme, setTheme } = useTheme();
  const h = health.data;

  return (
    <>
      <PageHeader title="Settings" description="System status and workspace preferences." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="System status" subtitle="Live from the SmartHire API" icon={<Server className="h-4 w-4" />}
            action={<Button variant="ghost" size="sm" onClick={health.refetch} loading={health.loading}>Refresh</Button>} />
          <div className="mt-3 divide-y divide-line">
            {health.error ? (
              <div className="p-5"><ErrorState message={health.error} onRetry={health.refetch} /></div>
            ) : !h ? (
              <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <>
                <Row label="API endpoint" value={<code className="rounded bg-elevated px-1.5 py-0.5 text-xs">{API_BASE}</code>} ok />
                <Row label="Version" value={`v${h.version} · ${h.environment}`} />
                <Row label="Database" value={<span className="inline-flex items-center gap-1.5"><Database className="h-3.5 w-3.5" />{h.database}</span>} ok={h.database === "ok"} />
                <Row
                  label="LLM providers"
                  hint={h.llm_providers.length ? "First provider is primary; the rest are automatic fallbacks." : "Set GOOGLE_API_KEY and/or GROQ_API_KEY on the backend."}
                  value={<span className="inline-flex items-center gap-1.5 capitalize"><Cpu className="h-3.5 w-3.5" />{h.llm_providers.join(" → ") || "None configured"}</span>}
                  ok={h.llm_providers.length > 0}
                />
                <Row
                  label="Email delivery (SMTP)"
                  hint={h.smtp_configured ? undefined : "Without SMTP credentials, sends are simulated and logged."}
                  value={<span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{h.smtp_configured ? "Configured" : "Simulated"}</span>}
                  ok={h.smtp_configured || undefined}
                />
                <Row label="Shortlist threshold" value={`${Math.round(h.shortlist_threshold * 100)} / 100`} />
                <Row label="Max upload size" value={`${h.max_upload_mb} MB per file`} />
              </>
            )}
          </div>
        </Card>

        <Card className="self-start">
          <CardHeader title="Appearance" subtitle="Saved to this browser" icon={<Monitor className="h-4 w-4" />} />
          <div className="grid grid-cols-2 gap-3 p-5">
            {([["light", Sun, "Light"], ["dark", Moon, "Dark"]] as const).map(([value, Icon, label]) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "group overflow-hidden rounded-xl border-2 text-left transition-all",
                  theme === value ? "border-brand shadow-glow" : "border-line hover:border-ink-subtle/50"
                )}
              >
                <div className={cn("h-20 p-3", value === "dark" ? "bg-[#070810]" : "bg-[#f6f7fc]")}>
                  <div className={cn("h-2 w-12 rounded-full", value === "dark" ? "bg-[#7c5cff]" : "bg-[#6247e6]")} />
                  <div className={cn("mt-2 h-8 rounded-md", value === "dark" ? "bg-[#0e1020]" : "bg-white shadow-sm")} />
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-ink"><Icon className="h-4 w-4" /> {label}</div>
              </button>
            ))}
          </div>
          <p className="px-5 pb-5 text-xs text-ink-subtle">Tip: press <span className="kbd">⌘</span> <span className="kbd">K</span> anywhere to search or switch themes.</p>
        </Card>
      </div>
    </>
  );
}
