import { supabaseAdmin } from '@/lib/supabase/admin'
import { suin } from './sources/suin'
import { dian } from './sources/dian'
import { superfinanciera } from './sources/superfinanciera'
import { sic } from './sources/sic'
import type { SourceAdapter } from './types'

// Adding a new source (leychile, diario oficial...) = 1 file in sources/ + 1 line here.
export const SOURCES: SourceAdapter[] = [suin, dian, superfinanciera, sic]
export async function ingestAll(limitPerSource = 25): Promise<Record<string, number>> {
  const db = supabaseAdmin()
  const stats: Record<string, number> = {}
  for (const src of SOURCES) {
    try {
      const rows = await src.fetch(limitPerSource)
      // Without ignoreDuplicates: existing rows GET REFRESHED. With the previous flag, an
      // already-ingested norm was immutable, so fixing a source's mapping (e.g. DIAN's
      // real date) wouldn't improve a single row of the already-loaded corpus.
      // The payload is SourceNorm (8 columns), and PostgREST only includes in the ON CONFLICT
      // DO UPDATE the columns present: summary/sectors/obligations/severity/analyzed_at
      // don't travel and survive, so this does NOT re-trigger LLM analysis. Verified
      // against the DB on one row before enabling it.
      // Note: count is now "rows touched" (refreshed + new), not just new ones.
      const { error, count } = await db
        .from('norms')
        .upsert(rows, { onConflict: 'external_id', count: 'exact' })
      if (error) throw error
      stats[src.id] = count ?? 0
    } catch (e) {
      console.error(`source ${src.id} failed:`, e)
      stats[src.id] = -1 // -1 = source down; the others keep going
    }
  }
  return stats
}
