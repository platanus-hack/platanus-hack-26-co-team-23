import { describe, it, expect } from 'vitest'
import { mapConstitutionalCourtRow, relatoriaUrl } from './corte-constitucional'

describe('mapConstitutionalCourtRow', () => {
  it('maps a real Socrata row (verified live against v2k4-2t8s)', () => {
    const row = mapConstitutionalCourtRow({
      proceso: 'Tutela',
      expediente_tipo: 'T',
      magistrado_a: 'Juan Carlos Cortés González',
      sala: 'Salas de Revisión',
      sentencia: 'T-228/26',
      fecha_sentencia: '2026-07-31T00:00:00.000',
    })
    expect(row).toEqual({
      external_id: 'cc-T-228-26',
      source: 'corte-constitucional',
      title: 'Sentencia T-228/26 — tutela',
      issuer: 'Corte Constitucional',
      norm_type: 'sentencia',
      published_at: '2026-07-31',
      url: 'https://www.corteconstitucional.gov.co/relatoria/2026/T-228-26.htm',
      raw_text: 'Sentencia: T-228/26\nProceso: Tutela\nTipo de expediente: tutela\nSala: Salas de Revisión\nMagistrado(a) ponente: Juan Carlos Cortés González',
    })
  })

  it('falls back to the raw code for an uncommon expediente_tipo', () => {
    const row = mapConstitutionalCourtRow({ sentencia: 'C-1/26', fecha_sentencia: '2026-01-05T00:00:00.000', expediente_tipo: 'CCP' })
    expect(row?.title).toBe('Sentencia C-1/26 — CCP')
  })

  it('returns null without a sentencia or a date', () => {
    expect(mapConstitutionalCourtRow({ fecha_sentencia: '2026-01-05T00:00:00.000' })).toBeNull()
    expect(mapConstitutionalCourtRow({ sentencia: 'T-1/26' })).toBeNull()
  })
})

describe('relatoriaUrl', () => {
  it('builds the public relatoria URL, swapping / for -', () => {
    expect(relatoriaUrl('T-228/13', '2013-05-02')).toBe('https://www.corteconstitucional.gov.co/relatoria/2013/T-228-13.htm')
  })

  it('returns null with a malformed year', () => {
    expect(relatoriaUrl('T-1/26', '')).toBeNull()
  })
})
