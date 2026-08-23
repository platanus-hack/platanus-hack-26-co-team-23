import * as XLSX from 'xlsx'
import type { SourceAdapter, SourceNorm } from '../types'

// Bills currently in Congress ("en trámite"), from the Cámara de Representantes' official export —
// the same file its site's "Descargar lista" button produces. This is the proactive half of
// complAI: norms that AREN'T law yet, so a company can weigh in before they pass.
//
// Why this source: the datos.gov.co JSON sets are years stale (Senate → 2023, Chamber → 2021).
// This export is refreshed daily and rich (título + objeto + estado + autores + link), with clean
// UTF-8. Public endpoint, no auth/nonce.
const EXPORT_URL = 'https://www.camara.gov.co/wp-admin/admin-ajax.php?action=download_proyectos_ley_xlsx'

type Row = Record<string, string | number>

const val = (v: unknown): string | null => {
  const s = typeof v === 'number' ? String(v) : typeof v === 'string' ? v.trim() : ''
  return s && s.toUpperCase() !== 'NULL' ? s : null
}

// Accent/case-insensitive header match — the export's headers carry accents ("Título") and could
// shift spacing between versions, so we don't hardcode exact strings.
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
function pick(row: Row, ...names: string[]): string | null {
  for (const n of names) {
    const key = Object.keys(row).find((k) => fold(k) === fold(n))
    if (key) return val(row[key])
  }
  return null
}

// Dates arrive ISO ("2026-08-19"); keep the D/M/YYYY branch as a safety net for older rows.
export function parseCongresoDate(raw: unknown): string | null {
  const v = val(raw)
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, d, mo, y] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// A bill is "en trámite" unless its estado says it's already resolved.
const RESUELTO = /archivad|retirad|sancionad|hundid|^ley$/i
export const enTramite = (estado: string | null): boolean => !!estado && !RESUELTO.test(estado)

// Siglas que se mantienen en mayúscula, y nombres propios que se re-capitalizan.
const SIGLAS = new Set(['IVA', 'IA', 'TIC', 'SIM', 'DIAN', 'SIC', 'ONU', 'OCDE', 'MIPYME', 'MIPYMES', 'PYME', 'PYMES', 'SENA', 'ARL', 'EPS', 'IPS', 'SGP', 'SGR', 'DNP', 'ICBF', 'SISBEN', 'VIS', 'POT', 'RUT', 'NIT', 'UGPP'])
const PROPIOS = new Set(['colombia', 'bogotá', 'bogota'])
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)

/**
 * Sentence-cases shouty ALL-CAPS bill titles ("POR LA CUAL SE..." → "Por la cual se...").
 * Leaves already mixed-case titles untouched, and keeps acronyms (IVA, IA, MIPYMES) upper and
 * a few proper nouns capitalized. Not perfect (some proper nouns slip through) — good enough for
 * readable cards without an NLP dependency.
 */
export function smartTitleCase(s: string): string {
  if (/[a-záéíóúñ]/.test(s)) return s // has lowercase → not shouty, leave it
  let first = true
  return s.toLowerCase().replace(/[\p{L}\p{N}]+/gu, (w) => {
    const upper = w.toUpperCase()
    if (SIGLAS.has(upper)) return upper
    if (PROPIOS.has(w)) return cap(w)
    if (first) { first = false; return cap(w) }
    return w
  })
}

export function mapCamaraRow(row: Row): SourceNorm | null {
  const num = pick(row, 'No. Cámara', 'No. Senado', 'No.')
  const titulo = pick(row, 'Título')
  const estado = pick(row, 'Estado de Ley')
  if (!num || !titulo || !enTramite(estado)) return null

  const objeto = pick(row, 'Objeto del proyecto')
  const autores = pick(row, 'Autores')
  const tipo = pick(row, 'Tipo de Ley')
  const comision = pick(row, 'Comisión(es)', 'Comisiones')
  const legislatura = pick(row, 'Legislatura')

  return {
    external_id: `congreso-camara-${num.replace(/[^\w/-]/g, '')}`,
    source: 'congreso',
    title: `Proyecto de Ley ${num} — ${smartTitleCase(titulo)}`,
    issuer: autores,
    norm_type: (tipo ?? 'proyecto de ley').toLowerCase(),
    published_at: parseCongresoDate(pick(row, 'Fecha Cámara', 'Fecha Senado')),
    url: pick(row, 'Link del Proyecto'),
    // Includes the real "Objeto del proyecto" so the analyzer works on substance, not just metadata.
    raw_text: [
      `Proyecto de Ley ${num} (Cámara de Representantes)`,
      tipo && `Tipo: ${tipo}`,
      estado && `Estado del trámite: ${estado}`,
      comision && `Comisión(es): ${comision}`,
      legislatura && `Legislatura: ${legislatura}`,
      autores && `Autores: ${autores}`,
      `Título: ${titulo}`,
      objeto && `Objeto: ${objeto}`,
    ]
      .filter(Boolean)
      .join('\n'),
    status: 'en_tramite',
  }
}

/** The export is the whole list, so we fetch+parse once and hand back a page via offset/limit. */
async function loadAll(): Promise<SourceNorm[]> {
  const res = await fetch(EXPORT_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`camara ${res.status}`)
  const wb = XLSX.read(new Uint8Array(await res.arrayBuffer()), { type: 'array' })
  const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], { defval: '' })
  const norms = rows.map(mapCamaraRow).filter((n): n is SourceNorm => n !== null)
  // Newest first, so a demo `limit` brings the freshest bills.
  return norms.sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
}

export const congreso: SourceAdapter = {
  id: 'congreso',
  async fetch(limit = 25, offset = 0) {
    return (await loadAll()).slice(offset, offset + limit)
  },
}
