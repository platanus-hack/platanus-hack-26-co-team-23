import { describe, it, expect } from 'vitest'
import { parseDianFile, extractDianDate } from './dian'

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

describe('extractDianDate', () => {
  it('saca la fecha real del encabezado de la resolucion', () => {
    expect(extractDianDate('RESOLUCIÓN 000021 DE 2026 (julio 17) Diario Oficial...', 2026)).toBe('2026-07-17')
    expect(extractDianDate('RESOLUCIÓN 004285 DE 2026 (marzo 26)', 2026)).toBe('2026-03-26')
  })

  it('padea el dia a dos digitos', () => {
    expect(extractDianDate('RESOLUCIÓN 000013 DE 2026 (mayo 7)', 2026)).toBe('2026-05-07')
  })

  it('cae al 1-ene si el encabezado no trae fecha', () => {
    expect(extractDianDate('RESOLUCION SIN FECHA DE 2026', 2026)).toBe('2026-01-01')
  })

  it('cae al 1-ene si el mes no es reconocible', () => {
    expect(extractDianDate('RESOLUCIÓN 1 DE 2026 (brumario 12)', 2026)).toBe('2026-01-01')
  })
})
