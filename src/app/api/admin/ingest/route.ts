import { auth } from '@clerk/nextjs/server'
import { runIngest } from '@/lib/ingest/run'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Admin-triggered ingest with live progress. The run happens inline and streams one JSON line
// per step (NDJSON), which the panel reads with fetch()+ReadableStream — no Broadcast, no
// realtime websocket, no auto-reconnect (unlike EventSource). Gated by Clerk: only org:admin.
// ?limit=N is per source (default 5 for the demo, capped at 25).
export async function GET(req: Request) {
  const { userId, orgRole } = await auth()
  if (!userId || orgRole !== 'org:admin') return new Response('Unauthorized', { status: 401 })

  const limitParam = Number(new URL(req.url).searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 25) : 5

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (p: unknown) => controller.enqueue(encoder.encode(JSON.stringify(p) + '\n'))
      try {
        await runIngest(limit, send)
      } catch (e) {
        send({ phase: 'error', message: (e as Error).message.slice(0, 200) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
