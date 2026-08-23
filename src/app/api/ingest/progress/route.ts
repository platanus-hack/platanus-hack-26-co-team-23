import { auth } from "@clerk/nextjs/server";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ingestTopic } from "@/lib/ingest/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HEARTBEAT_MS = 25_000;

// Streams the ingest's Broadcast progress (topic ingest:<run>) to the admin panel over SSE.
// Same server-side-Realtime → EventSource pattern as /api/alerts/stream; only admins trigger
// ingests, so only admins may watch. The run id is opaque, so no per-org filter is needed.
export async function GET(req: Request) {
  const { userId, orgRole } = await auth();
  if (!userId || orgRole !== "org:admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const runId = new URL(req.url).searchParams.get("run");
  if (!runId) {
    return new Response("Missing run", { status: 400 });
  }

  const admin = supabaseAdmin();
  const encoder = new TextEncoder();
  let channel: RealtimeChannel;
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      channel = admin
        .channel(ingestTopic(runId))
        .on("broadcast", { event: "progress" }, ({ payload }) => {
          controller.enqueue(
            encoder.encode(`event: progress\ndata: ${JSON.stringify(payload)}\n\n`),
          );
        })
        .subscribe();

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, HEARTBEAT_MS);
    },
    cancel() {
      clearInterval(heartbeat);
      admin.removeChannel(channel);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
