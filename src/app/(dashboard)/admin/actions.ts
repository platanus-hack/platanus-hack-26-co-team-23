"use server";

import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { appUrl } from "@/lib/app-url";

// Both actions are fire-and-forget: they authorize + kick off the work with `after()`
// (runs after the response is sent, kept alive by the page's maxDuration) and return
// immediately, so the UI never blocks. Progress shows up in the feed (SSE) / server logs.
// The CRON_SECRET stays server-side. Only org:admin can trigger them.
async function assertAdmin() {
  const { orgRole } = await auth();
  if (orgRole !== "org:admin") throw new Error("Solo administradores");
}

/** Manual update: run the ingest in the background, capped to `maxNews` per source. */
export async function runManualUpdate(maxNews: number): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  const n = Math.max(1, Math.min(Math.floor(Number(maxNews) || 5), 25));
  const url = `${appUrl()}/api/cron/ingest?limit=${n}`;
  const secret = process.env.CRON_SECRET;
  after(async () => {
    try {
      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
      console.log("manual ingest:", res.status, (await res.text()).slice(0, 300));
    } catch (e) {
      console.error("manual ingest failed:", e);
    }
  });
  return { ok: true };
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
