import type { SourceAdapter, SourceNorm } from '../types'

// datos.gov.co (Socrata/SODA), dataset v2k4-2t8s: "Sentencias proferidas por la Corte
// Constitucional" — free, no API key, 49k+ rulings since 1992. Metadata-only like SUIN
// (no full text, no URL column), but $order=fecha_sentencia DESC does the right thing
// natively, unlike SUIN's a_o (no sorting bug to work around here).
const DATASET = 'v2k4-2t8s'

// Docket-type code → readable label. Kept small on purpose: T (tutela) and D (demanda de
// inconstitucionalidad) alone are >90% of the dataset; anything else falls back to the raw code.
const EXPEDIENTE_TIPO: Record<string, string> = {
  T: 'tutela',
  D: 'demanda de inconstitucionalidad',
  LAT: 'revisión de tratado internacional',
  RE: 'revisión de estados de excepción',
  OP: 'objeción presidencial',
  PE: 'control previo de referendo',
}

type SocrataRow = {
  proceso?: string
  expediente_tipo?: string
  magistrado_a?: string
  sala?: string
  sentencia?: string
  fecha_sentencia?: string // e.g. "2026-07-31T00:00:00.000"
}

// The court publishes each ruling at a predictable URL: /relatoria/<full year>/<CODE>.htm,
// where <CODE> is the "sentencia" field with its slash swapped for a dash (e.g. "T-228/26" →
// "T-228-26"). Verified live against rulings from 1997, 2013, and 2026.
export function relatoriaUrl(sentencia: string, fechaSentencia: string): string | null {
  const code = sentencia.replace('/', '-')
  const year = fechaSentencia.slice(0, 4)
  if (!code || !/^\d{4}$/.test(year)) return null
  return `https://www.corteconstitucional.gov.co/relatoria/${year}/${code}.htm`
}

export function mapConstitutionalCourtRow(row: SocrataRow): SourceNorm | null {
  const sentencia = row.sentencia?.trim()
  const fecha = row.fecha_sentencia?.slice(0, 10)
  if (!sentencia || !fecha) return null

  const tipo = row.expediente_tipo?.trim()
  const tipoLabel = tipo ? EXPEDIENTE_TIPO[tipo] ?? tipo : null

  return {
    external_id: `cc-${sentencia.replace('/', '-')}`,
    source: 'corte-constitucional',
    title: `Sentencia ${sentencia}${tipoLabel ? ` — ${tipoLabel}` : ''}`,
    issuer: 'Corte Constitucional',
    norm_type: 'sentencia',
    published_at: fecha,
    url: relatoriaUrl(sentencia, fecha),
    raw_text: [
      `Sentencia: ${sentencia}`,
      row.proceso && `Proceso: ${row.proceso}`,
      tipoLabel && `Tipo de expediente: ${tipoLabel}`,
      row.sala && `Sala: ${row.sala}`,
      row.magistrado_a && `Magistrado(a) ponente: ${row.magistrado_a}`,
    ].filter(Boolean).join('\n'),
  }
}

export const corteConstitucional: SourceAdapter = {
  id: 'corte-constitucional',
  async fetch(limit = 25) {
    const order = encodeURIComponent('fecha_sentencia DESC')
    const res = await fetch(
      `https://www.datos.gov.co/resource/${DATASET}.json?$limit=${limit}&$order=${order}`,
      { headers: { Accept: 'application/json' } },
    )
    if (!res.ok) throw new Error(`SODA ${res.status}`)
    return ((await res.json()) as SocrataRow[])
      .map(mapConstitutionalCourtRow)
      .filter((n): n is SourceNorm => n !== null)
  },
}
