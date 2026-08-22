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

  // Regresion: con .match() el primer "(palabra dd)" que no fuera mes mataba la fecha en
  // silencio. Caso real: resolucion_dian_0196_2025 trae "(Casilla 2)" en el cuerpo.
  it('sigue buscando si el primer candidato no es un mes', () => {
    expect(extractDianDate('Ver (Casilla 2) — RESOLUCIÓN 196 DE 2025 (febrero 28)', 2025)).toBe('2025-02-28')
  })

  it('no confunde un 1-ene real con el fallback', () => {
    expect(extractDianDate('RESOLUCIÓN 4 DE 2026 (enero 1)', 2026)).toBe('2026-01-01')
  })

  // El encabezado vive al arranque; un mes citado en el cuerpo no debe ganar.
  it('ignora fechas que aparecen tarde en el documento', () => {
    const tarde = 'RESOLUCION SIN FECHA '.padEnd(2500, '.') + ' (agosto 15)'
    expect(extractDianDate(tarde, 2026)).toBe('2026-01-01')
  })
})
