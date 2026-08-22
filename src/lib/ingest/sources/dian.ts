import type { SourceAdapter, SourceNorm } from '../types'
import { stripHtml, parseSpanishDate, BROWSER_HEADERS } from '../scrape'

const BASE = 'https://normograma.dian.gov.co/dian/compilacion'
// Doc semilla: la compilación jurídica (Res. 227/2025) — un HTML gigante cuyo cuerpo
// cross-linkea cientos de docs del Normograma. Funciona como índice de facto,
// porque la portada del sitio carga su árbol por JS y no es scrapeable.
const SEED = `${BASE}/docs/resolucion_dian_0227_2025.htm`

// Cuántos docs se bajan para poder ordenar por fecha REAL antes de truncar. El número del
// nombre de archivo no es cronológico (la Res. 4285 es de marzo, la 21 de julio), así que
// cortar antes de conocer la fecha se puede llevar la norma más nueva. Hoy el seed expone 28
// docs y bajarlos cuesta ~8,5 s contra el maxDuration=300 del cron; el tope acota el peor caso.
const MAX_CANDIDATES = 60

export function parseDianFile(file: string) {
  // resolucion_dian_0003_2026.htm → tipo/número/año
  const m = file.match(/^([a-z]+)_dian_(\d+)_(\d{4})\.htm$/)!
  return { norm_type: m[1], number: Number(m[2]), year: Number(m[3]) }
}

// El encabezado trae la fecha real: "RESOLUCIÓN 000021 DE 2026 (julio 17)".
export function extractDianDate(text: string, year: number): string {
  const fallback = `${year}-01-01`
  // Se acota al arranque del doc: el encabezado vive en los primeros ~1.000 chars, y más
  // abajo el cuerpo tiene paréntesis que engañan al patrón (p. ej. "(Casilla 2)").
  const head = text.slice(0, 2000)
  // matchAll y no match: con match, un "(Casilla 2)" antes del encabezado devolvía el
  // fallback en silencio, indistinguible de un doc realmente sin fecha.
  for (const m of head.matchAll(/\(\s*([A-Za-zÁÉÍÓÚáéíóú]{4,12})\s+(\d{1,2})\s*\)/g)) {
    const parsed = parseSpanishDate(`${m[1]} ${m[2]} ${year}`)
    // parseSpanishDate también cae a -01-01 cuando el mes no resuelve; se distingue de un
    // 1-ene real comprobando que el día haya sobrevivido (si sobrevivió, el mes resolvió).
    if (parsed && Number(parsed.slice(-2)) === Number(m[2])) return parsed
  }
  return fallback
}

export const dian: SourceAdapter = {
  id: 'dian',
  async fetch(limit = 10) {
    const seed = await (await fetch(SEED, { headers: BROWSER_HEADERS })).text()
    const files = [...new Set(seed.match(/[a-z]+_dian_\d+_202[5-9]\.htm/g) ?? [])]
      .sort((a, b) => {
        const pa = parseDianFile(a), pb = parseDianFile(b)
        return pb.year - pa.year || pb.number - pa.number
      })
      // Preselección por año+número, solo para acotar cuántos se bajan.
      .slice(0, Math.max(limit, MAX_CANDIDATES))

    const norms: SourceNorm[] = []
    for (const file of files) {
      const url = `${BASE}/docs/${file}`
      const res = await fetch(url, { headers: BROWSER_HEADERS })
      if (!res.ok) continue
      const html = await res.text()
      const meta = parseDianFile(file)
      const title = stripHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? file).slice(0, 150)
      const raw_text = stripHtml(html).slice(0, 60000) // texto COMPLETO — ventaja de esta fuente
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
    // Recortar por fecha real, ya conocida: así el truncado no se lleva la norma más nueva.
    return norms
      .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
      .slice(0, limit)
  },
}
