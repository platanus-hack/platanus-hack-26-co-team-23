import { NextRequest, NextResponse } from 'next/server'
import { runIngest } from '@/lib/ingest/run'

export const maxDuration = 300

// POST for manual curl; GET for Vercel Cron (invokes via GET with the
// Authorization: Bearer $CRON_SECRET header when CRON_SECRET is set).
// ?limit=N — demo mode: bring only ~N per source. Omit it → full cron behaviour.
async function handle(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limitParam = Number(new URL(req.url).searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : null

  const result = await runIngest(limit)
  return NextResponse.json(result)
}

export { handle as GET, handle as POST }
