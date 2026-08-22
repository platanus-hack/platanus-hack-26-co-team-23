import type { SourceAdapter, SourceNorm } from '../types'
import { stripHtml, BROWSER_HEADERS } from '../scrape'

const BASE = 'https://normograma.dian.gov.co/dian/compilacion'
// Doc semilla: la compilación jurídica (Res. 227/2025) — un HTML gigante cuyo cuerpo
// cross-linkea cientos de docs del Normograma. Funciona como índice de facto,
// porque la portada del sitio carga su árbol por JS y no es scrapeable.
const SEED = `${BASE}/docs/resolucion_dian_0227_2025.htm`

export function parseDianFile(file: string) {
  // resolucion_dian_0003_2026.htm → tipo/número/año
  const m = file.match(/^([a-z]+)_dian_(\d+)_(\d{4})\.htm$/)!
  return { norm_type: m[1], number: Number(m[2]), year: Number(m[3]) }
}

export const dian: SourceAdapter = {
  id: 'dian',
  async fetch(limit = 10) {
    const seed = await (await fetch(SEED, { headers: BROWSER_HEADERS })).text()
    const files = [...new Set(seed.match(/[a-z]+_dian_\d+_202[5-9]\.htm/g) ?? [])]
      .sort((a, b) => {
        const pa = parseDianFile(a), pb = parseDianFile(b)
        return pb.year - pa.year || pb.number - pa.number // más recientes primero
      })
      .slice(0, limit)

    const norms: SourceNorm[] = []
    for (const file of files) {
      const url = `${BASE}/docs/${file}`
      const res = await fetch(url, { headers: BROWSER_HEADERS })
      if (!res.ok) continue
      const html = await res.text()
      const meta = parseDianFile(file)
      const title = stripHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? file).slice(0, 150)
      norms.push({
        external_id: `dian-${file.replace('.htm', '')}`,
        source: 'dian',
        title,
        issuer: 'DIAN',
        norm_type: meta.norm_type,
        published_at: `${meta.year}-01-01`,
        url,
        raw_text: stripHtml(html).slice(0, 60000), // texto COMPLETO — ventaja de esta fuente
      })
    }
    return norms
  },
}
