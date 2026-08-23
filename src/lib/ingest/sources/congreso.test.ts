import { describe, expect, it } from 'vitest'
import { parseCongresoDate, mapCamaraRow, enTramite } from './congreso'

describe('parseCongresoDate', () => {
  it('passes ISO dates through', () => {
    expect(parseCongresoDate('2026-08-19')).toBe('2026-08-19')
    expect(parseCongresoDate('2026-08-19T00:00:00')).toBe('2026-08-19')
  })
  it('reformats Colombian D/M/YYYY to ISO', () => {
    expect(parseCongresoDate('9/6/2018')).toBe('2018-06-09')
  })
  it('returns null for junk/empty/NULL', () => {
    expect(parseCongresoDate('NULL')).toBeNull()
    expect(parseCongresoDate('')).toBeNull()
    expect(parseCongresoDate(null)).toBeNull()
  })
})

describe('enTramite', () => {
  it('is true for active statuses', () => {
    expect(enTramite('Trámite en Comisión')).toBe(true)
    expect(enTramite('Pendiente Ponencia Primer Debate')).toBe(true)
  })
  it('is false for resolved statuses', () => {
    for (const s of ['Ley', 'Sancionada', 'Archivado', 'Retirado', 'Hundido']) expect(enTramite(s)).toBe(false)
    expect(enTramite(null)).toBe(false)
  })
})

describe('mapCamaraRow', () => {
  const row = {
    'No. Cámara': '228/2026C',
    'Título': 'EDUCACIÓN MEDIA COMO DERECHO FUNDAMENTAL',
    'Objeto del proyecto': 'Modificar el artículo 67 de la Constitución...',
    'Tipo de Ley': 'Acto Legislativo',
    'Autores': 'Ana Leidy Erazo Ruiz, Daniel Felipe Briceño Montes',
    'Estado de Ley': 'Trámite en Comisión',
    'Comisión(es)': 'Primera',
    'Legislatura': '2026-2027',
    'Fecha Cámara': '2026-08-19',
    'Link del Proyecto': 'https://www.camara.gov.co/educacion-media',
  }

  it('maps a real Cámara row and marks it en_tramite', () => {
    const n = mapCamaraRow(row)!
    expect(n).not.toBeNull()
    expect(n.source).toBe('congreso')
    expect(n.status).toBe('en_tramite')
    expect(n.external_id).toBe('congreso-camara-228/2026C')
    expect(n.published_at).toBe('2026-08-19')
    expect(n.url).toBe('https://www.camara.gov.co/educacion-media')
    expect(n.title).toBe('Proyecto de Ley 228/2026C — EDUCACIÓN MEDIA COMO DERECHO FUNDAMENTAL')
    expect(n.raw_text).toContain('Objeto: Modificar el artículo 67')
    expect(n.raw_text).toContain('Estado del trámite: Trámite en Comisión')
  })
  it('drops resolved bills (already Ley/Archivado)', () => {
    expect(mapCamaraRow({ ...row, 'Estado de Ley': 'Ley' })).toBeNull()
    expect(mapCamaraRow({ ...row, 'Estado de Ley': 'Archivado' })).toBeNull()
  })
  it('skips rows without a number or title', () => {
    expect(mapCamaraRow({ ...row, 'Título': '' })).toBeNull()
  })
})
