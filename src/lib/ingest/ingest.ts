import { supabaseAdmin } from '@/lib/supabase/admin'
import { suin } from './sources/suin'
import { dian } from './sources/dian'
import { superfinanciera } from './sources/superfinanciera'
import { sic } from './sources/sic'
import { legalize } from './sources/legalize'
import { corteConstitucional } from './sources/corte-constitucional'
import { croma } from './sources/croma'
import type { SourceAdapter, SourceNorm } from './types'

// Adding a new source (leychile, diario oficial...) = 1 file in sources/ + 1 line here.
export const SOURCES: SourceAdapter[] = [suin, dian, superfinanciera, sic, legalize, corteConstitucional, croma]

/** Pages to walk per source per run. Sources that can't paginate stop after page 1. */
const DEFAULT_PAGES = 8

export type SourceStat = { fetched: number; nuevas: number; paginas: number; error?: string }

/**
 * Walks each source page by page and upserts what it finds.
 *
 * Two things this fixes over the previous version:
 *
 *  1. It paginates. Every adapter used to return only its first page, so re-running
 *     the cron brought the exact same rows and the corpus flat-lined at 115 — even
 *     though SUIN alone has >1,000 norms in force per year.
 *  2. It reports what actually got inserted. The old count came from the upsert, which
 *     counts rows *touched* (refreshed + new), so a run that added nothing still
 *     reported `suin: 15`. Now `nuevas` is measured against the ids already stored.
 */
export async function ingestAll(
  limitPerSource = 25,
  pages = DEFAULT_PAGES,
): Promise<Record<string, SourceStat>> {
  const db = supabaseAdmin()
  const stats: Record<string, SourceStat> = {}

  for (const src of SOURCES) {
    const stat: SourceStat = { fetched: 0, nuevas: 0, paginas: 0 }
    stats[src.id] = stat
    try {
      let previa: string | null = null
      for (let page = 0; page < pages; page++) {
        const rows = await src.fetch(limitPerSource, page * limitPerSource)
        if (!rows.length) break

        // Whether the source paginates is decided by comparing pages, NOT by whether
        // they brought anything new: the first pages are usually norms we already have,
        // and the new ones live further in. Cutting on "nothing new" stopped SUIN at
        // page 1 forever.
        const huella = rows.map((r) => r.external_id).join('|')
        if (huella === previa) break // identical page → the source ignores `offset`
        previa = huella
        stat.paginas++
        stat.fetched += rows.length

        const nuevas = await countNew(rows)
        // Without ignoreDuplicates the existing rows get refreshed, so a fix to a
        // source's mapping improves the corpus already loaded. The payload is
        // SourceNorm (8 columns) and PostgREST only updates the columns present, so
        // summary/sectors/obligations/severity/analyzed_at survive — this does NOT
        // re-trigger LLM analysis.
        const { error } = await db.from('norms').upsert(rows, { onConflict: 'external_id' })
        if (error) throw error
        stat.nuevas += nuevas
      }
    } catch (e) {
      stat.error = (e as Error).message.slice(0, 120)
      console.error(`source ${src.id} failed:`, e)
    }
  }
  return stats
}

/** How many of these are not stored yet — the honest "new" count. */
async function countNew(rows: SourceNorm[]): Promise<number> {
  const ids = rows.map((r) => r.external_id)
  const { data } = await supabaseAdmin().from('norms').select('external_id').in('external_id', ids)
  return ids.length - (data?.length ?? 0)
}
