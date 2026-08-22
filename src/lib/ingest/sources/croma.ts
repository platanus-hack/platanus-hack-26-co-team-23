import type { SourceAdapter, SourceNorm } from '../types'

// Croma (usecroma.com): self-serve API, org-scoped bearer key, 100 req/day on the plan
// we're on. Croma also mirrors the Legalize.dev laws dataset under a paid endpoint
// (/co/legalize/laws/v1) — using it here would just duplicate the `legalize` source, so
// this adapter targets Consejo de Estado case law instead: real jurisprudence content
// that no other source in this pipeline covers.
//
// Endpoint contract per docs.usecroma.com/guides/colombia/consejo-estado.md (verified
// 2026-08-22). NOT verified against a live response — no CROMA_API_KEY was provisioned
// at the time this was written, so `fetch` fails fast (caught by ingestAll, source
// marked down) until a key is set. If Croma's actual field names differ, only
// `mapConsejoDeEstadoRow` / `extractRows` need to change.
const ENDPOINT = 'https://api.croma.run/co/consejo-estado/search/v1'

// The daily quota is tight (100 req/day/org) and the docs don't mention a sort param, so
// we don't paginate: one request, `per_page` at the documented max, sorted by real date
// client-side — same fix as the SFC/DIAN "trusted the wrong order" bugs found earlier in
// this pipeline (see PR #23).
const MAX_PER_PAGE = 20
const LOOKBACK_DAYS = 180

type ConsejoEstadoRow = {
  radicado?: string
  tipo?: 'AUTO' | 'CONCEPTO' | 'SENTENCIA'
  seccion?: string
  fecha?: string // YYYY-MM-DD
  ponente?: string
  demandante?: string
  demandado?: string
  norma_demandada?: string
  descriptores?: string
  es_unificacion?: boolean
  es_extension?: boolean
  url?: string
}

export function mapConsejoDeEstadoRow(row: ConsejoEstadoRow): SourceNorm | null {
  const radicado = row.radicado?.trim()
  const fecha = row.fecha?.trim()
  if (!radicado || !fecha) return null

  const tipo = row.tipo ?? 'SENTENCIA'
  const tags = [row.es_unificacion && 'unificación', row.es_extension && 'extensión de jurisprudencia']
    .filter(Boolean)

  return {
    external_id: `croma-ce-${radicado}`,
    source: 'croma',
    title: `${tipo} ${radicado} — Consejo de Estado${row.seccion ? ` (${row.seccion})` : ''}`,
    issuer: 'Consejo de Estado',
    norm_type: tipo.toLowerCase(),
    published_at: fecha,
    url: row.url ?? null,
    raw_text: [
      `${tipo} ${radicado} — Consejo de Estado`,
      row.ponente && `Ponente: ${row.ponente}`,
      row.norma_demandada && `Norma demandada: ${row.norma_demandada}`,
      row.demandante && `Demandante: ${row.demandante}`,
      row.demandado && `Demandado: ${row.demandado}`,
      row.descriptores && `Descriptores: ${row.descriptores}`,
      tags.length && `(${tags.join(', ')})`,
    ].filter(Boolean).join('\n'),
  }
}

// The docs describe the response as "total, count, and the matching rows" without ever
// showing a full JSON example or naming the array field. Rather than hardcode a guess,
// take the first array found under any of the plausible names.
const ROW_ARRAY_KEYS = ['results', 'rows', 'data', 'items'] as const

export function extractRows(body: unknown): ConsejoEstadoRow[] {
  if (!body || typeof body !== 'object') return []
  for (const key of ROW_ARRAY_KEYS) {
    const value = (body as Record<string, unknown>)[key]
    if (Array.isArray(value)) return value as ConsejoEstadoRow[]
  }
  return []
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export const croma: SourceAdapter = {
  id: 'croma',
  async fetch(limit = 25) {
    const apiKey = process.env.CROMA_API_KEY
    if (!apiKey) throw new Error('CROMA_API_KEY not set')

    const to = new Date()
    const from = new Date(to.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_date: isoDate(from),
        to_date: isoDate(to),
        per_page: Math.min(limit, MAX_PER_PAGE),
      }),
    })
    if (!res.ok) throw new Error(`Croma ${res.status}`)

    return extractRows(await res.json())
      .map(mapConsejoDeEstadoRow)
      .filter((n): n is SourceNorm => n !== null)
      .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
      .slice(0, limit)
  },
}
