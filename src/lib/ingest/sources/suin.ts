import type { SourceAdapter, SourceNorm } from '../types'

// El dataset trae "NULL" como texto literal — normalizar a null real
const clean = (v: unknown): string | null =>
  typeof v === 'string' && v !== 'NULL' && v.trim() ? v : null

export function mapSuinRecord(raw: Record<string, unknown>): SourceNorm {
  const tipo = clean(raw.tipo) ?? 'NORMA'
  const numero = clean(raw.n_mero) ?? '?'
  const anio = clean(raw.a_o) ?? '?'
  const subtipo = clean(raw.subtipo)
  const entidad = clean(raw.entidad)
  const sector = clean(raw.sector)
  const materia = clean(raw.materia)
  const vigencia = clean(raw.vigencia)
  return {
    external_id: `suin-${tipo}-${numero}-${anio}`,
    source: 'suin',
    title: `${tipo} ${numero} de ${anio}${entidad ? ` — ${entidad}` : ''}`,
    issuer: entidad,
    norm_type: tipo.toLowerCase(),
    // el dataset solo trae el año — aproximación para ordenar, no fecha real de publicación
    published_at: /^\d{4}$/.test(anio) ? `${anio}-01-01` : null,
    url: null, // el dataset no trae URL; la ficha vive en suin-juriscol.gov.co
    // metadata como pseudo-texto: sector/materia oficiales de MinJusticia dan contexto real a Claude
    raw_text: [
      `Tipo: ${tipo}${subtipo ? ` (${subtipo})` : ''}`,
      entidad && `Entidad: ${entidad}`,
      sector && `Sector (MinJusticia): ${sector}`,
      materia && `Materia: ${materia}`,
      vigencia && `Vigencia: ${vigencia}`,
    ].filter(Boolean).join('\n'),
  }
}

export const suin: SourceAdapter = {
  id: 'suin',
  async fetch(limit = 25) {
    // Solo años recientes y vigentes; a_o es texto con basura histórica — jamás ordenar por a_o global
    const where = encodeURIComponent(`a_o in ('2025','2026') AND vigencia='Vigente'`)
    // Ordenar por año DESC para que el año corriente entre primero: hay >1.000 normas vigentes
    // por año y el $limit cortaba en un tramo arbitrario, así que 2026 nunca aparecía.
    // Es seguro pese al aviso de arriba porque el $where ya restringe a 2025/2026 (comparar
    // '2026' > '2025' como texto da el orden correcto); sin el filtro sí traería basura tipo "996".
    const order = encodeURIComponent('a_o DESC')
    const res = await fetch(
      `https://www.datos.gov.co/resource/fiev-nid6.json?$limit=${limit}&$where=${where}&$order=${order}`,
      { headers: { Accept: 'application/json' } },
    )
    if (!res.ok) throw new Error(`SODA ${res.status}`)
    return ((await res.json()) as Record<string, unknown>[]).map(mapSuinRecord)
  },
}
