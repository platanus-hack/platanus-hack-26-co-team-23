import { supabaseAdmin } from '@/lib/supabase/admin'
import { suin } from './sources/suin'
import { dian } from './sources/dian'
import { superfinanciera } from './sources/superfinanciera'
import { sic } from './sources/sic'
import type { SourceAdapter } from './types'

// Agregar una fuente nueva (leychile, diario oficial...) = 1 archivo en sources/ + 1 línea aquí.
export const SOURCES: SourceAdapter[] = [suin, dian, superfinanciera, sic]
export async function ingestAll(limitPerSource = 25): Promise<Record<string, number>> {
  const db = supabaseAdmin()
  const stats: Record<string, number> = {}
  for (const src of SOURCES) {
    try {
      const rows = await src.fetch(limitPerSource)
      // Sin ignoreDuplicates: las filas existentes SE REFRESCAN. Con el flag anterior una
      // norma ya ingestada era inmutable, así que arreglar el mapeo de una fuente (p. ej. la
      // fecha real de DIAN) no mejoraba ni una fila del corpus ya cargado.
      // El payload es SourceNorm (8 columnas), y PostgREST solo incluye en el ON CONFLICT
      // DO UPDATE las columnas presentes: summary/sectors/obligations/severity/analyzed_at
      // no viajan y sobreviven, así que esto NO re-dispara el análisis LLM. Verificado
      // contra la DB en una fila antes de habilitarlo.
      // Ojo: el count ahora es "filas tocadas" (refrescadas + nuevas), no solo nuevas.
      const { error, count } = await db
        .from('norms')
        .upsert(rows, { onConflict: 'external_id', count: 'exact' })
      if (error) throw error
      stats[src.id] = count ?? 0
    } catch (e) {
      console.error(`fuente ${src.id} falló:`, e)
      stats[src.id] = -1 // -1 = fuente caída; las demás siguen
    }
  }
  return stats
}
