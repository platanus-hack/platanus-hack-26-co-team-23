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
 * Brief for an alert. Generated with the model the first time and stored in
 * `alerts.brief`; later calls (another channel, the PDF download) read it back.
 */
export async function getOrCreateBrief(alertId: string): Promise<AlertBrief | null> {
  const db = supabaseAdmin()
  const { data: alert } = await db
    .from('alerts')
    .select('id, brief, norms(*), companies(name, company_type, sectors)')
    .eq('id', alertId)
    .single()
  if (!alert?.norms || !alert?.companies) return null

  const norm = alert.norms as unknown as Norm
  const company = alert.companies as unknown as Pick<Company, 'name' | 'company_type' | 'sectors'>

  const cached = BriefSchema.safeParse(alert.brief)
  const brief = cached.success ? cached.data : await generateBrief(norm, company)

  // Only write when we just generated it.
  if (!cached.success) await db.from('alerts').update({ brief }).eq('id', alertId)

  return {
    brief,
    normTitle: norm.title,
    companyName: company.name,
    source: norm.source,
    url: norm.url,
  }
}
