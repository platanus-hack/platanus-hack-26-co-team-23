import { describe, it, expect } from 'vitest'
import { parseDianFile, extractDianDate } from './dian'

describe('parseDianFile', () => {
  it('extracts type, number, and year from the Normograma file name', () => {
    expect(parseDianFile('resolucion_dian_0227_2025.htm')).toEqual({
      norm_type: 'resolucion',
      number: 227,
      year: 2025,
    })
  })

  it('supports other norm types (decreto, concepto)', () => {
    expect(parseDianFile('decreto_dian_0003_2026.htm')).toEqual({
      norm_type: 'decreto',
      number: 3,
      year: 2026,
    })
  })
})

describe('extractDianDate', () => {
  it('extracts the real date from the resolution header', () => {
    expect(extractDianDate('RESOLUCIÓN 000021 DE 2026 (julio 17) Diario Oficial...', 2026)).toBe('2026-07-17')
    expect(extractDianDate('RESOLUCIÓN 004285 DE 2026 (marzo 26)', 2026)).toBe('2026-03-26')
  })

  it('pads the day to two digits', () => {
    expect(extractDianDate('RESOLUCIÓN 000013 DE 2026 (mayo 7)', 2026)).toBe('2026-05-07')
  })

  it('falls back to Jan 1st if the header has no date', () => {
    expect(extractDianDate('RESOLUCION SIN FECHA DE 2026', 2026)).toBe('2026-01-01')
  })

  it('falls back to Jan 1st if the month is not recognizable', () => {
    expect(extractDianDate('RESOLUCIÓN 1 DE 2026 (brumario 12)', 2026)).toBe('2026-01-01')
  })

  // Regression: with .match(), the first "(word dd)" that wasn't a month silently killed
  // the date. Real case: resolucion_dian_0196_2025 has "(Casilla 2)" in the body.
  it('keeps searching if the first candidate is not a month', () => {
    expect(extractDianDate('Ver (Casilla 2) — RESOLUCIÓN 196 DE 2025 (febrero 28)', 2025)).toBe('2025-02-28')
  })

  it('does not confuse a real Jan 1st with the fallback', () => {
    expect(extractDianDate('RESOLUCIÓN 4 DE 2026 (enero 1)', 2026)).toBe('2026-01-01')
  })

  // The header lives at the start; a month cited in the body must not win.
  it('ignores dates that appear late in the document', () => {
    const late = 'RESOLUCION SIN FECHA '.padEnd(2500, '.') + ' (agosto 15)'
    expect(extractDianDate(late, 2026)).toBe('2026-01-01')
  })
})
