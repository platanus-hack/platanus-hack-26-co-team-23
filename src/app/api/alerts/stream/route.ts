import { auth } from "@clerk/nextjs/server";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HEARTBEAT_MS = 25_000;

export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = supabaseAdmin();
  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("clerk_org_id", orgId)
    .single();

  if (!company) {
    return new Response("Company not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let channel: RealtimeChannel;
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      channel = admin
        .channel(`alerts-company-${company.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "alerts",
            filter: `company_id=eq.${company.id}`,
          },
          (payload) => {
            const alertId = (payload.new as { id: string }).id;
            controller.enqueue(
              encoder.encode(`event: alert\ndata: ${JSON.stringify({ id: alertId })}\n\n`),
            );
          },
        )
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
