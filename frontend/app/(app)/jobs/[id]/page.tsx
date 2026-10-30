"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/primitives";

/** /jobs/:id sends you to the shortlist once screened, otherwise to the upload step. */
export default function JobIndexPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    api.jobs.get(id)
      .then((j) => router.replace(j.stats.processed_count ? `/jobs/${id}/results` : `/jobs/${id}/upload`))
      .catch(() => router.replace("/jobs"));
  }, [id, router]);
  return <Skeleton className="h-64 rounded-2xl" />;
}
