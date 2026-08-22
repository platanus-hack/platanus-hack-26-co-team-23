import { describe, it, expect } from 'vitest'
import { parseDianFile } from './dian'

describe('parseDianFile', () => {
  it('extrae tipo, número y año del nombre de archivo del Normograma', () => {
    expect(parseDianFile('resolucion_dian_0227_2025.htm')).toEqual({
      norm_type: 'resolucion',
      number: 227,
      year: 2025,
    })
  })

  it('soporta otros tipos de norma (decreto, concepto)', () => {
    expect(parseDianFile('decreto_dian_0003_2026.htm')).toEqual({
      norm_type: 'decreto',
      number: 3,
      year: 2026,
    })
  })
})
