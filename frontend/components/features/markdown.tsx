"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Styled markdown for agent answers (GFM tables, lists, code). */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed text-ink", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (p) => <p className="leading-relaxed" {...p} />,
          strong: (p) => <strong className="font-semibold text-ink" {...p} />,
          ul: (p) => <ul className="list-disc space-y-1 pl-5 marker:text-ink-subtle" {...p} />,
          ol: (p) => <ol className="list-decimal space-y-1 pl-5 marker:text-ink-subtle" {...p} />,
          h1: (p) => <h3 className="text-base font-semibold" {...p} />,
          h2: (p) => <h3 className="text-base font-semibold" {...p} />,
          h3: (p) => <h4 className="text-sm font-semibold" {...p} />,
          a: (p) => <a className="text-brand-soft underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />,
          code: (p) => <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[12px]" {...p} />,
          blockquote: (p) => <blockquote className="border-l-2 border-brand/40 pl-3 text-ink-muted" {...p} />,
          table: (p) => (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-xs" {...p} />
            </div>
          ),
          thead: (p) => <thead className="bg-elevated/60 text-ink-muted" {...p} />,
          th: (p) => <th className="px-3 py-2 font-medium" {...p} />,
          td: (p) => <td className="border-t border-line px-3 py-2 align-top" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
