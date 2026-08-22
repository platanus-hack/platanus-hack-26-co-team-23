"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// No UI — just refreshes the RSC tree when Supabase Realtime reports a new
// alert, so /feed stays live without the user having to reload the page.
export function AlertsLive() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/alerts/stream");
    source.addEventListener("alert", () => router.refresh());
    return () => source.close();
  }, [router]);

  return null;
}
