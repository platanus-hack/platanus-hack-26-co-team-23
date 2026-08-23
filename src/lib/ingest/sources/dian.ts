import type { SourceAdapter, SourceNorm } from '../types'
import { stripHtml, parseSpanishDate, BROWSER_HEADERS } from '../scrape'

const BASE = 'https://normograma.dian.gov.co/dian/compilacion'
// Seed doc: the legal compilation (Res. 227/2025) — a giant HTML page whose body
// cross-links hundreds of Normograma docs. It works as a de facto index,
// since the site's homepage loads its tree via JS and isn't scrapeable.
const SEED = `${BASE}/docs/resolucion_dian_0227_2025.htm`

// How many docs to download so they can be sorted by REAL date before truncating. The
// file name's number isn't chronological (Res. 4285 is from March, 21 is from July), so
// cutting before knowing the date can drop the newest norm. Today the seed exposes 28
// docs and downloading them costs ~8.5s against the cron's maxDuration=300; the cap bounds the worst case.
const MAX_CANDIDATES = 60

export function parseDianFile(file: string) {
  // resolucion_dian_0003_2026.htm → type/number/year
  const m = file.match(/^([a-z]+)_dian_(\d+)_(\d{4})\.htm$/)!
  return { norm_type: m[1], number: Number(m[2]), year: Number(m[3]) }
}

// The header carries the real date: "RESOLUCIÓN 000021 DE 2026 (julio 17)".
export function extractDianDate(text: string, year: number): string {
  const fallback = `${year}-01-01`
  // Bounded to the start of the doc: the header lives in the first ~1,000 chars, and
  // further down the body has parentheses that fool the pattern (e.g. "(Casilla 2)").
  const head = text.slice(0, 2000)
  // matchAll, not match: with match, a "(Casilla 2)" before the header would silently
  // return the fallback, indistinguishable from a doc that genuinely has no date.
  for (const m of head.matchAll(/\(\s*([A-Za-zÁÉÍÓÚáéíóú]{4,12})\s+(\d{1,2})\s*\)/g)) {
    const parsed = parseSpanishDate(`${m[1]} ${m[2]} ${year}`)
    // parseSpanishDate also falls back to -01-01 when the month doesn't resolve; distinguish
    // it from a genuine Jan 1st by checking the day survived (if it did, the month resolved).
    if (parsed && Number(parsed.slice(-2)) === Number(m[2])) return parsed
  }
  return fallback
}

export const dian: SourceAdapter = {
  id: 'dian',
  async fetch(limit = 10, offset = 0) {
    // Bounded source: the seed exposes ~28 docs and there is no page 2 to walk to. Rather
    // than paginate, page 0 returns everything found (it was already downloaded, and the
    // old `.slice(0, limit)` threw ~13 of them away) and later pages return nothing, which
    // makes ingestAll move on without paying a second full scrape of the same 28 documents.
    if (offset > 0) return []
    const seed = await (await fetch(SEED, { headers: BROWSER_HEADERS })).text()
    const files = [...new Set(seed.match(/[a-z]+_dian_\d+_202[5-9]\.htm/g) ?? [])]
      .sort((a, b) => {
        const pa = parseDianFile(a), pb = parseDianFile(b)
        return pb.year - pa.year || pb.number - pa.number // most recent first
      })
      // Preselect by year+number, only to bound how many get downloaded.
      .slice(0, Math.max(limit, MAX_CANDIDATES))

    const norms: SourceNorm[] = []
    for (const file of files) {
      const url = `${BASE}/docs/${file}`
      const res = await fetch(url, { headers: BROWSER_HEADERS })
      if (!res.ok) continue
      const html = await res.text()
      const meta = parseDianFile(file)
      const title = stripHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? file).slice(0, 150)
      const raw_text = stripHtml(html).slice(0, 60000) // FULL text — this source's advantage
      norms.push({
        external_id: `dian-${file.replace('.htm', '')}`,
        source: 'dian',
        title,
        issuer: 'DIAN',
        norm_type: meta.norm_type,
        published_at: extractDianDate(raw_text, meta.year),
        url,
        raw_text,
      })
    }
    // Newest first; `limit` already bounded the download above, so nothing is trimmed here.
    return norms.sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
  },
}
