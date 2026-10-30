"use client";

import { api } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { ErrorState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { EmailReview } from "@/components/features/email-review";

export default function OutboxPage() {
  const drafts = useQuery(() => api.emails.list(), []);

  return (
    <>
      <PageHeader
        title="Outbox"
        description="Every AI-drafted candidate email across your roles. Edit, approve, and send — nothing leaves without a human."
      />
      {drafts.error ? (
        <ErrorState message={drafts.error} onRetry={drafts.refetch} />
      ) : !drafts.data ? (
        <Skeleton className="h-[620px] rounded-2xl" />
      ) : (
        <EmailReview
          drafts={drafts.data}
          showJob
          height="h-[calc(100vh-300px)] min-h-[520px]"
          onChange={(d) => drafts.setData((prev) => prev?.map((x) => (x.id === d.id ? d : x)))}
        />
      )}
    </>
  );
}
