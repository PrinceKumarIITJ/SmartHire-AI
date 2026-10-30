"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/primitives";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-xl py-20">
      <ErrorState message={error.message || "Something went wrong while rendering this page."} onRetry={reset} />
    </div>
  );
}
