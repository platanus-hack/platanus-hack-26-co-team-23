import type { SourceAdapter, SourceNorm } from '../types'

// Bills still being debated in Congress ("en trámite"), from the Senate's open-data set on
// datos.gov.co (SODA API, same clean JSON path as SUIN). We keep only the ones whose estado is
// "PENDIENTE ..." — a bill mid-process, not one already passed (LEY) or shelved (ARCHIVADO).
// This is the proactive half of complAI: norms that AREN'T law yet, so a company can weigh in.
//
// Note: this dataset is a few years behind. The adapter pattern means a live scraper of
// leyes.senado.gov.co can replace it later without touching the model.
const RESOURCE = 'https://www.datos.gov.co/resource/feim-cysj.json'

const clean = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() && v.trim().toUpperCase() !== 'NULL' ? v.trim() : null

// The set mixes ISO ("2022-07-21") and Colombian D/M/YYYY ("9/6/2018") in the same column.
export function parseCongresoDate(raw: unknown): string | null {
  const v = clean(raw)
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, d, mo, y] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

export function mapCongresoRecord(raw: Record<string, unknown>): SourceNorm | null {
  const titulo = clean(raw.titulo)
  const nSenado = clean(raw.n_senado)
  if (!titulo || !nSenado) return null // skip the dataset's header/junk rows

  const autor = clean(raw.autor)
  const comision = clean(raw.comision)
  const estado = clean(raw.estado)

  return {
    external_id: `congreso-senado-${nSenado.replace(/[^\w/-]/g, '')}`,
    source: 'congreso',
    title: `Proyecto de Ley ${nSenado} — ${titulo.replace(/^["“]|["”]$/g, '')}`,
    issuer: autor,
    norm_type: 'proyecto de ley',
    published_at: parseCongresoDate(raw.f_presentado),
    url: 'https://leyes.senado.gov.co/proyectos/index.php/proyectos-ley',
    raw_text: [
      `Proyecto de Ley ${nSenado} (Senado de la República)`,
      autor && `Autor(es): ${autor}`,
      comision && `Comisión: ${comision}`,
      estado && `Estado del trámite: ${estado}`,
      `Título: ${titulo}`,
    ]
      .filter(Boolean)
      .join('\n'),
    status: 'en_tramite',
  }
}

export const congreso: SourceAdapter = {
  id: 'congreso',
  async fetch(limit = 25, offset = 0) {
    // Only bills mid-process; the dataset is dominated by ARCHIVADO/LEY which are not "en trámite".
    const where = encodeURIComponent("titulo IS NOT NULL AND upper(estado) like 'PENDIENTE%'")
    const res = await fetch(
      `${RESOURCE}?$limit=${limit}&$offset=${offset}&$where=${where}`,
      { headers: { Accept: 'application/json' } },
    )
    if (!res.ok) throw new Error(`SODA ${res.status}`)
    const rows = (await res.json()) as Record<string, unknown>[]
    return rows.map(mapCongresoRecord).filter((n): n is SourceNorm => n !== null)
  },
}
