import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Sector } from '@/lib/types'
import type { CitizenProfile } from './croma'

/**
 * Turns a citizen profile into the same dimensions the B2B matching already speaks,
 * so the norms a person sees come from the corpus we already ingest and analyze.
 */
export function sectorsFor(profile: CitizenProfile): Sector[] {
  // Everyone is a data subject, a worker or pensioner, a taxpayer and a consumer:
  // these four carry the norms that reach any adult in Colombia.
  const base: Sector[] = ['datos-personales', 'laboral-general', 'tributario-general', 'comercio']
  // Health affiliation is the one real discriminator ADRES gives us.
  if (profile.regimen || profile.eps) base.push('salud')
  return [...new Set(base)]
}

export type CitizenMatch = {
  id: string
  title: string
  summary: string | null
  severity: string | null
  url: string | null
  issuer: string | null
  source: string
  obligations: { action: string; deadline: string | null }[]
  porQue: string
}

/** Why this norm showed up — shown next to it, so the list never feels arbitrary. */
function reason(sectors: string[], profile: CitizenProfile): string {
  if (sectors.includes('salud') && (profile.regimen || profile.eps))
    return `Estás afiliado a salud${profile.regimen ? ` en régimen ${profile.regimen}` : ''}.`
  if (sectors.includes('tributario-general')) return 'Aplica a toda persona natural que declare o pague impuestos.'
  if (sectors.includes('datos-personales')) return 'Aplica a cualquier persona cuyos datos sean tratados por terceros.'
  if (sectors.includes('laboral-general')) return 'Aplica a trabajadores, independientes y pensionados.'
  return 'Aplica a personas naturales.'
}

const RANK: Record<string, number> = { high: 3, medium: 2, low: 1, info: 0 }

/** Norms that apply to this person, most severe first. */
export async function matchForCitizen(profile: CitizenProfile, limit = 5): Promise<CitizenMatch[]> {
  const sectors = sectorsFor(profile)
  const { data } = await supabaseAdmin()
    .from('norms')
    .select('id, title, summary, severity, url, issuer, source, sectors, company_types, obligations')
    .not('analyzed_at', 'is', null)
    .overlaps('sectors', sectors)
    .limit(60)

  return (data ?? [])
    // A norm scoped to companies only isn't this person's problem.
    .filter((n) => !n.company_types?.length || n.company_types.includes('persona natural'))
    .sort((a, b) => (RANK[b.severity ?? 'info'] ?? 0) - (RANK[a.severity ?? 'info'] ?? 0))
    .slice(0, limit)
    .map((n) => ({
      id: n.id,
      title: n.title,
      summary: n.summary,
      severity: n.severity,
      url: n.url,
      issuer: n.issuer,
      source: n.source,
      obligations: n.obligations ?? [],
      porQue: reason(n.sectors ?? [], profile),
    }))
}
