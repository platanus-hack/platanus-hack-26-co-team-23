import type { SourceAdapter, SourceNorm } from '../types'

// Croma (usecroma.com): self-serve API, org-scoped bearer key, 100 req/day on the plan
// we're on. Croma also mirrors the Legalize.dev laws dataset under a paid endpoint
// (/co/legalize/laws/v1) — using it here would just duplicate the `legalize` source, so
// this adapter targets Consejo de Estado case law instead: real jurisprudence content
// that no other source in this pipeline covers.
//
// Endpoint contract per docs.usecroma.com/guides/colombia/consejo-estado.md, verified
// live 2026-08-22 against a real key. Two things the docs got wrong or left out:
//   1. The payload is wrapped one level deeper than documented: `{ data: { ...total,
//      count, results } }`, not `{ total, count, results }` at the top level.
//   2. `descriptores` is an array of strings, not a single string.
// Also found live and NOT a bug: this endpoint's Consejo de Estado corpus currently ends
// at 2022-02-24 — every query for 2023+ returns `total: 0`, regardless of `tipo`. Same
// shape as the SIC source elsewhere in this pipeline (stuck in 2023): it's real content,
// but it will not produce new rulings going forward until Croma's own index catches up.
const ENDPOINT = 'https://api.croma.run/co/consejo-estado/search/v1'

// The daily quota is tight (100 req/day/org — confirmed via the `ratelimit-policy`
// response header) so we don't paginate: one request, `per_page` at the documented max,
// sorted by real date client-side — same fix as the SFC/DIAN "trusted the wrong order"
// bugs found earlier in this pipeline (see PR #23).
const MAX_PER_PAGE = 20
// Wide on purpose: the corpus currently tops out ~4.5 years back (see note above). A
// tight recent window would silently return zero rows forever; this one still finds
// the newest available rulings today and keeps working if Croma's index catches up.
const LOOKBACK_DAYS = 5 * 365

type ConsejoEstadoRow = {
  radicado?: string
  tipo?: 'AUTO' | 'CONCEPTO' | 'SENTENCIA'
  seccion?: string
  fecha?: string // YYYY-MM-DD
  ponente?: string
  demandante?: string
  demandado?: string
  norma_demandada?: string | null
  descriptores?: string[]
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
      row.descriptores?.length && `Descriptores: ${row.descriptores.join('; ')}`,
      tags.length && `(${tags.join(', ')})`,
    ].filter(Boolean).join('\n'),
  }
}

// The docs never show a full response example. Verified live: the row array is at
// `body.data.results`, one level deeper than documented. Kept defensive anyway — check
// a couple of plausible names, and at both the top level and one level under `data` —
// rather than hardcoding the exact nesting, in case Croma changes it again.
const ROW_ARRAY_KEYS = ['results', 'rows', 'data', 'items'] as const

function findRowArray(obj: unknown): ConsejoEstadoRow[] | null {
  if (!obj || typeof obj !== 'object') return null
  for (const key of ROW_ARRAY_KEYS) {
    const value = (obj as Record<string, unknown>)[key]
    if (Array.isArray(value)) return value as ConsejoEstadoRow[]
  }
  return null
}

export function extractRows(body: unknown): ConsejoEstadoRow[] {
  if (!body || typeof body !== 'object') return []
  const direct = findRowArray(body)
  if (direct) return direct
  const nested = findRowArray((body as Record<string, unknown>).data)
  return nested ?? []
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export const croma: SourceAdapter = {
  id: 'croma',
  async fetch(limit = 25, offset = 0) {
    // Deliberately unpaginated (see MAX_PER_PAGE above): returning nothing past page 0 keeps
    // ingestAll from spending a second request per run against the 100/day quota just to
    // discover the source repeats itself.
    if (offset > 0) return []
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
