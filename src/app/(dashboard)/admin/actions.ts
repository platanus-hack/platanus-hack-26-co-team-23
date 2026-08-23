"use server";

import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { appUrl } from "@/lib/app-url";

// Fire-and-forget: authorize + kick off the work with `after()` (runs after the response is
// sent, kept alive by the page's maxDuration) and return immediately, so the UI never blocks.
// The CRON_SECRET stays server-side. Only org:admin can trigger it.
// (The ingest has its own streaming route — /api/admin/ingest — because it drives a progress bar.)
async function assertAdmin() {
  const { orgRole } = await auth();
  if (orgRole !== "org:admin") throw new Error("Solo administradores");
}

/** Manual notification: run the match in the background (matching + brief + dispatch). */
export async function runManualNotification(): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  const url = `${appUrl()}/api/cron/match`;
  const secret = process.env.CRON_SECRET;
  after(async () => {
    try {
      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
      console.log("manual match:", res.status, (await res.text()).slice(0, 300));
    } catch (e) {
      console.error("manual match failed:", e);
    }
  });
  return { ok: true };
}
