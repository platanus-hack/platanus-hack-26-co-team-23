import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Company, Norm } from '@/lib/types'
import { BriefSchema, generateBrief, type Brief } from './brief'

export type AlertBrief = {
  brief: Brief
  normTitle: string
  companyName: string
  source: string | null
  url: string | null
}

/**
 * Brief de una alerta. Se genera con el modelo la primera vez y se guarda en
 * `alerts.brief`; las siguientes llamadas (otro canal, la descarga del PDF) lo releen.
 */
export async function getOrCreateBrief(alertId: string): Promise<AlertBrief | null> {
  const db = supabaseAdmin()
  const { data: alert } = await db
    .from('alerts')
    .select('id, impact, brief, norms(*), companies(name, company_type, sectors)')
    .eq('id', alertId)
    .single()
  if (!alert?.norms || !alert?.companies) return null

  const norm = alert.norms as unknown as Norm
  const company = alert.companies as unknown as Pick<Company, 'name' | 'company_type' | 'sectors'>

  const guardado = BriefSchema.safeParse(alert.brief)
  const brief = guardado.success
    ? guardado.data
    : await generateBrief(norm, company, alert.impact)

  // Solo escribimos cuando lo acabamos de generar.
  if (!guardado.success) await db.from('alerts').update({ brief }).eq('id', alertId)

  return {
    brief,
    normTitle: norm.title,
    companyName: company.name,
    source: norm.source,
    url: norm.url,
  }
}
