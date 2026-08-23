"use server";

import { auth } from "@clerk/nextjs/server";
import { appUrl } from "@/lib/app-url";

// Both actions run server-side and reuse the cron endpoints with the CRON_SECRET, so the
// secret never reaches the browser. Only org:admin can trigger them.
async function assertAdmin() {
  const { orgRole } = await auth();
  if (orgRole !== "org:admin") throw new Error("Solo administradores");
}

type Result = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

/** Manual update: run the ingest, capped to `maxNews` per source to keep the demo small. */
export async function runManualUpdate(maxNews: number): Promise<Result> {
  await assertAdmin();
  const n = Math.max(1, Math.min(Math.floor(Number(maxNews) || 5), 25));
  try {
    const res = await fetch(`${appUrl()}/api/cron/ingest?limit=${n}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    if (!res.ok) return { ok: false, error: `ingest ${res.status}` };
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Manual notification: run the match (matching + brief + multichannel dispatch). */
export async function runManualNotification(): Promise<Result> {
  await assertAdmin();
  try {
    const res = await fetch(`${appUrl()}/api/cron/match`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    if (!res.ok) return { ok: false, error: `match ${res.status}` };
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
