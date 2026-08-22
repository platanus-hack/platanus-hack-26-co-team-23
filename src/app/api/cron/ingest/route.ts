import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ingestAll } from '@/lib/ingest/ingest'
import { analyzeNorm } from '@/lib/ingest/analyze'

export const maxDuration = 300

/** Analysis budget per run: one LLM call each, in batches. */
const MAX_ANALYZED = 40
const CONCURRENCY = 5

// POST for manual curl; GET for Vercel Cron (invokes via GET with the
// Authorization: Bearer $CRON_SECRET header when CRON_SECRET is set).
async function handle(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Per source: 15 rows per page, up to 4 pages. A source that can't paginate stops
  // after the first page on its own.
  const sources = await ingestAll(15)
  const db = supabaseAdmin()

  // Paginating brings many more norms per run, so the analysis budget went up and now
  // runs in concurrent batches — one at a time couldn't keep up and left a backlog
  // that took six runs to drain.
  const { data: pending } = await db.from('norms').select('*').is('analyzed_at', null).limit(MAX_ANALYZED)

  let analyzed = 0
  for (let i = 0; i < (pending ?? []).length; i += CONCURRENCY) {
    const batch = (pending ?? []).slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (norm) => {
        const a = await analyzeNorm(norm.title, norm.raw_text ?? norm.title)
        await db.from('norms').update({ ...a, analyzed_at: new Date().toISOString() }).eq('id', norm.id)
      }),
    )
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') analyzed++
      else console.error(`analyze failed for ${batch[j].external_id}:`, r.reason)
    })
  }

  const nuevas = Object.values(sources).reduce((n, s) => n + s.nuevas, 0)
  const { count: pendientes } = await db
    .from('norms')
    .select('id', { count: 'exact', head: true })
    .is('analyzed_at', null)
  return NextResponse.json({ nuevas, analyzed, pendientes, sources })
}

export { handle as GET, handle as POST }
