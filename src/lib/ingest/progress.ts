/**
 * Ephemeral ingest progress over Supabase Realtime Broadcast.
 *
 * The ingest runs fire-and-forget in `after()`, so the browser has no direct line to it.
 * Instead the run POSTs each step to Supabase's Broadcast REST endpoint (a plain fetch — no
 * websocket to set up inside the compute-heavy route) on the topic `ingest:<runId>`, and the
 * SSE route at /api/ingest/progress subscribes to that topic and forwards it to the client.
 * Nothing is persisted: progress is throwaway, so there is no table and no cleanup.
 */
export type IngestProgress =
  | { phase: "fetch"; done: number; total: number; source: string }
  | { phase: "analyze"; done: number; total: number }
  | { phase: "done"; nuevas: number; analyzed: number; pendientes: number }
  | { phase: "error"; message: string };

export const ingestTopic = (runId: string) => `ingest:${runId}`;

/** Best-effort: a failed broadcast must never break the ingest itself. */
export async function emitProgress(runId: string, payload: IngestProgress): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        messages: [{ topic: ingestTopic(runId), event: "progress", payload }],
      }),
    });
  } catch (e) {
    console.error("emitProgress failed:", e);
  }
}
