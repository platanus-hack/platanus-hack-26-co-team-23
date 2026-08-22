import { describe, it, expect } from 'vitest'
import { mapSuinRecord } from './suin'

describe('mapSuinRecord', () => {
  it('maps a real SODA record to SuinRow', () => {
    const raw = { tipo: 'DECRETO', n_mero: '6', a_o: '2025', subtipo: 'DECRETO ORDINARIO',
      sector: 'Hacienda y Crédito Público', entidad: 'MINISTERIO DE HACIENDA Y CRÉDITO PÚBLICO',
      materia: 'Tesorería', vigencia: 'Vigente' }
    const row = mapSuinRecord(raw)
    expect(row).toEqual({
      external_id: 'suin-DECRETO-6-2025',
      source: 'suin',
      title: 'DECRETO 6 de 2025 — MINISTERIO DE HACIENDA Y CRÉDITO PÚBLICO',
      issuer: 'MINISTERIO DE HACIENDA Y CRÉDITO PÚBLICO',
      norm_type: 'decreto',
      published_at: '2025-01-01',
      url: null,
      raw_text: 'Tipo: DECRETO (DECRETO ORDINARIO)\nEntidad: MINISTERIO DE HACIENDA Y CRÉDITO PÚBLICO\nSector (MinJusticia): Hacienda y Crédito Público\nMateria: Tesorería\nVigencia: Vigente',
    })
  })

  it('normalizes the dataset\'s literal "NULL" values', () => {
    const row = mapSuinRecord({ tipo: 'RESOLUCION', n_mero: '179', a_o: '2025', subtipo: 'NULL', materia: 'NULL', vigencia: 'NULL' })
    expect(row.raw_text).not.toContain('NULL')
    expect(row.external_id).toBe('suin-RESOLUCION-179-2025')
  })
})
