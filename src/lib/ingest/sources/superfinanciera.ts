import type { SourceAdapter, SourceNorm } from '../types'
import { stripHtml, parseSpanishDate, BROWSER_HEADERS } from '../scrape'

// Páginas anuales de circulares externas (server-rendered, verificadas), MÁS NUEVA PRIMERO.
// Es una lista, no un objeto: JS reordena las claves que parecen enteros de forma ascendente,
// así que un `{'2026':…, '2025':…}` se recorría como 2025→2026 y el año corriente caía al final,
// donde el `.slice(0, limit)` lo descartaba entero. Agregar un año nuevo = 1 línea arriba.
const YEAR_PAGES: ReadonlyArray<readonly [string, string]> = [
  ['2026', 'https://www.superfinanciera.gov.co/publicaciones/10115974/circulares-externas-2026/'],
  ['2025', 'https://www.superfinanciera.gov.co/publicaciones/10115459/circulares-externas-2025/'],
]

const pageUrlFor = (year: string) => YEAR_PAGES.find(([y]) => y === year)?.[1] ?? null

// El listado es una tabla: <tr> [Número | Fecha | Descripción | Boletín] + links idFile de descarga.
export function parseSfcListing(html: string, year: string): SourceNorm[] {
  const pageUrl = pageUrlFor(year)
  const norms: SourceNorm[] = []
  for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(([, c]) => stripHtml(c))
    if (cells.length < 3 || !/^\d{1,3}$/.test(cells[0])) continue // header u otras filas
    const [num, fecha, desc] = cells
    const idFile = row.match(/idFile=(\d+)/)?.[1]
    norms.push({
      external_id: `sfc-circular-externa-${num.padStart(3, '0')}-${year}`,
      source: 'superfinanciera',
      title: `Circular Externa ${num} de ${year} (SFC) — ${desc.slice(0, 90)}`,
      issuer: 'Superfinanciera',
      norm_type: 'circular',
      // La columna Fecha trae "Mayo 11" (sin año) — se le pega el año de la página.
      // Antes se fechaba todo el 1-ene, que rompía cualquier orden por novedad.
      published_at: parseSpanishDate(`${fecha} ${year}`) ?? `${year}-01-01`,
      url: idFile
        ? `https://www.superfinanciera.gov.co/loader.php?lServicio=Tools2&lTipo=descargas&lFuncion=descargar&idFile=${idFile}`
        : pageUrl,
      raw_text: `Circular Externa ${num} de ${year} — Superfinanciera. Fecha: ${fecha}. ${desc}`,
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
      // Recortar por las MÁS NUEVAS, no por el orden en que se recorrieron las páginas.
      .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
      .slice(0, limit)
  },
}
