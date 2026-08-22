import type { SourceAdapter, SourceNorm } from '../types'

// The dataset carries "NULL" as literal text — normalize to a real null
const clean = (v: unknown): string | null =>
  typeof v === 'string' && v !== 'NULL' && v.trim() ? v : null

export function mapSuinRecord(raw: Record<string, unknown>): SourceNorm {
  const type = clean(raw.tipo) ?? 'NORMA'
  const number = clean(raw.n_mero) ?? '?'
  const year = clean(raw.a_o) ?? '?'
  const subtype = clean(raw.subtipo)
  const entity = clean(raw.entidad)
  const sector = clean(raw.sector)
  const subject = clean(raw.materia)
  const status = clean(raw.vigencia)
  return {
    external_id: `suin-${type}-${number}-${year}`,
    source: 'suin',
    title: `${type} ${number} de ${year}${entity ? ` — ${entity}` : ''}`,
    issuer: entity,
    norm_type: type.toLowerCase(),
    // the dataset only carries the year — an approximation for sorting, not the real publication date
    published_at: /^\d{4}$/.test(year) ? `${year}-01-01` : null,
    url: null, // the dataset doesn't carry a URL; the record lives on suin-juriscol.gov.co
    // metadata as pseudo-text: MinJusticia's official sector/subject give Claude real context
    raw_text: [
      `Tipo: ${type}${subtype ? ` (${subtype})` : ''}`,
      entity && `Entidad: ${entity}`,
      sector && `Sector (MinJusticia): ${sector}`,
      subject && `Materia: ${subject}`,
      status && `Vigencia: ${status}`,
    ].filter(Boolean).join('\n'),
  }
}

export const suin: SourceAdapter = {
  id: 'suin',
  async fetch(limit = 25) {
    // Only recent, currently-in-force years; a_o is text with historical junk in it — never sort by global a_o
    const where = encodeURIComponent(`a_o in ('2025','2026') AND vigencia='Vigente'`)
    // Sort by year DESC so the current year comes first: there are >1,000 norms in force
    // per year and $limit cut at an arbitrary point, so 2026 never showed up.
    // This is safe despite the warning above because $where already restricts to 2025/2026
    // (comparing '2026' > '2025' as text gives the right order); without the filter it would
    // bring in junk like "996".
    const order = encodeURIComponent('a_o DESC')
    const res = await fetch(
      `https://www.datos.gov.co/resource/fiev-nid6.json?$limit=${limit}&$where=${where}&$order=${order}`,
      { headers: { Accept: 'application/json' } },
    )
    if (!res.ok) throw new Error(`SODA ${res.status}`)
    return ((await res.json()) as Record<string, unknown>[]).map(mapSuinRecord)
  },
}
