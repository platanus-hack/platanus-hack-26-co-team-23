import { supabaseAdmin } from '@/lib/supabase/admin'
import { ingestAll, SOURCES, type SourceStat } from './ingest'
import { analyzeNorm } from './analyze'

/** Analysis budget per run: one LLM call each, in batches. */
const MAX_ANALYZED = 40
const CONCURRENCY = 5

/**
 * Splice the model's per-"�" replacement letters back into the title. Only the "�" positions
 * change — the rest of the string is untouched — so the model can restore accents on any word
 * (no dictionary) without being able to restructure the title. If the count doesn't match what the
 * model returned, we leave the title as-is rather than guess.
 */
export function repairTitle(title: string, accents?: string[]): string {
  const holes = (title.match(/�/g) ?? []).length
  if (!holes || !accents || accents.length !== holes) return title
  let i = 0
  return title.replace(/�/g, () => accents[i++] ?? '�')
}

// A single 0→100 run reported step by step: fetch (x/sources) then analyze (x/N) then done.
export type IngestProgress =
  | { phase: 'fetch'; done: number; total: number; source: string }
  | { phase: 'analyze'; done: number; total: number }
  | { phase: 'done'; nuevas: number; analyzed: number; pendientes: number }
  | { phase: 'error'; message: string }

export type IngestResult = {
  nuevas: number
  analyzed: number
  pendientes: number
  sources: Record<string, SourceStat>
}

/**
 * Runs the whole ingest (fetch every source, then analyze the freshest unanalyzed norms) and
 * reports each step through `onProgress`. Shared by the cron route (no progress) and the admin
 * SSE route (streams progress to the panel's bar), so both stay in sync.
 *
 * `limit` is PER SOURCE — a demo run ingests up to limit × SOURCES norms, so the analysis
 * budget scales to that total (capped at MAX_ANALYZED) or most fresh norms would stay
 * unanalyzed and the match would never alert on them. `null` = full cron behaviour.
 */
export async function runIngest(
  limit: number | null,
  onProgress?: (p: IngestProgress) => void,
): Promise<IngestResult> {
  const demo = typeof limit === 'number' && limit > 0
  const analysisBudget = demo ? Math.min(limit * SOURCES.length, MAX_ANALYZED) : MAX_ANALYZED

  const onSource = (done: number, total: number, source: string) =>
    onProgress?.({ phase: 'fetch', done, total, source })
  const sources = demo
    ? await ingestAll(Math.min(limit, 25), 1, onSource)
    : await ingestAll(15, undefined, onSource)

  const db = supabaseAdmin()
  // Newest-published first: without an order the budget could be spent on stale backlog rows
  // instead of the norms this run just brought in, so a demo run looked like it did nothing.
  const { data: pending } = await db
    .from('norms')
    .select('*')
    .is('analyzed_at', null)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(analysisBudget)

  const toAnalyze = pending ?? []
  onProgress?.({ phase: 'analyze', done: 0, total: toAnalyze.length })

  let analyzed = 0
  for (let i = 0; i < toAnalyze.length; i += CONCURRENCY) {
    const batch = toAnalyze.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (norm) => {
        const { title_accents, ...analysis } = await analyzeNorm(norm.title, norm.raw_text ?? norm.title)
        const patch: Record<string, unknown> = { ...analysis, analyzed_at: new Date().toISOString() }
        const title = repairTitle(norm.title, title_accents)
        if (title !== norm.title) patch.title = title
        await db.from('norms').update(patch).eq('id', norm.id)
      }),
    )
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') analyzed++
      else console.error(`analyze failed for ${batch[j].external_id}:`, r.reason)
    })
    onProgress?.({ phase: 'analyze', done: Math.min(i + CONCURRENCY, toAnalyze.length), total: toAnalyze.length })
  }

  const nuevas = Object.values(sources).reduce((n, s) => n + s.nuevas, 0)
  const { count: pendientes } = await db
    .from('norms')
    .select('id', { count: 'exact', head: true })
    .is('analyzed_at', null)

  onProgress?.({ phase: 'done', nuevas, analyzed, pendientes: pendientes ?? 0 })
  return { nuevas, analyzed, pendientes: pendientes ?? 0, sources }
}
