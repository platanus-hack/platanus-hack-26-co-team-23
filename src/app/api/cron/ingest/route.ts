import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ingestAll } from '@/lib/ingest/ingest'
import { analyzeNorm } from '@/lib/ingest/analyze'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const inserted = await ingestAll(15) // {suin: N, dian: M, ...} — -1 marks a down source
  const db = supabaseAdmin()
  const { data: pending } = await db.from('norms').select('*').is('analyzed_at', null).limit(10)

  let analyzed = 0
  for (const norm of pending ?? []) {
    try {
      const a = await analyzeNorm(norm.title, norm.raw_text ?? norm.title)
      await db.from('norms').update({ ...a, analyzed_at: new Date().toISOString() }).eq('id', norm.id)
      analyzed++
    } catch (e) {
      console.error(`analyze failed for ${norm.external_id}:`, e)
    }
  }
  return NextResponse.json({ inserted, analyzed })
}
