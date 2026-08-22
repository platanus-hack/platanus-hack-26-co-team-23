import type { SourceAdapter, SourceNorm } from '../types'
import { stripHtml, parseSpanishDate, BROWSER_HEADERS } from '../scrape'

// Annual external-circulars pages (server-rendered, verified), NEWEST FIRST.
// It's a list, not an object: JS reorders keys that look like integers in ascending
// order, so a `{'2026':…, '2025':…}` was walked as 2025→2026 and the current year fell to
// the end, where `.slice(0, limit)` dropped it entirely. Adding a new year = 1 line above.
const YEAR_PAGES: ReadonlyArray<readonly [string, string]> = [
  ['2026', 'https://www.superfinanciera.gov.co/publicaciones/10115974/circulares-externas-2026/'],
  ['2025', 'https://www.superfinanciera.gov.co/publicaciones/10115459/circulares-externas-2025/'],
]

const pageUrlFor = (year: string) => YEAR_PAGES.find(([y]) => y === year)?.[1] ?? null

// The listing is a table: <tr> [Number | Date | Description | Bulletin] + idFile download links.
export function parseSfcListing(html: string, year: string): SourceNorm[] {
  const pageUrl = pageUrlFor(year)
  const norms: SourceNorm[] = []
  for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(([, c]) => stripHtml(c))
    if (cells.length < 3 || !/^\d{1,3}$/.test(cells[0])) continue // header or other rows
    const [num, date, desc] = cells
    const idFile = row.match(/idFile=(\d+)/)?.[1]
    norms.push({
      external_id: `sfc-circular-externa-${num.padStart(3, '0')}-${year}`,
      source: 'superfinanciera',
      title: `Circular Externa ${num} de ${year} (SFC) — ${desc.slice(0, 90)}`,
      issuer: 'Superfinanciera',
      norm_type: 'circular',
      // The Date column carries "Mayo 11" (no year) — the page's year gets appended.
      // Before, everything was dated Jan 1st, which broke any ordering by recency.
      published_at: parseSpanishDate(`${date} ${year}`) ?? `${year}-01-01`,
      url: idFile
        ? `https://www.superfinanciera.gov.co/loader.php?lServicio=Tools2&lTipo=descargas&lFuncion=descargar&idFile=${idFile}`
        : pageUrl,
      raw_text: `Circular Externa ${num} de ${year} — Superfinanciera. Fecha: ${date}. ${desc}`,
    })
  }
  return norms
}

export const superfinanciera: SourceAdapter = {
  id: 'superfinanciera',
  async fetch(limit = 20) {
    const norms: SourceNorm[] = []
    for (const [year, url] of YEAR_PAGES) {
      const html = await (await fetch(url, { headers: BROWSER_HEADERS })).text()
      norms.push(...parseSfcListing(html, year))
    }
    const seen = new Set<string>()
    return norms
      .filter((n) => !seen.has(n.external_id) && seen.add(n.external_id))
      // Trim by the NEWEST ones, not by the order the pages were walked in.
      .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
      .slice(0, limit)
  },
}
