import { describe, it, expect } from 'vitest'
import { sourceLine, sourceLabel } from './sources'

describe('sourceLine', () => {
  it('combina emisor y portal cuando son distintos', () => {
    expect(sourceLine('MINISTERIO DE HACIENDA Y CRÉDITO PÚBLICO', 'suin')).toBe(
      'MINISTERIO DE HACIENDA Y CRÉDITO PÚBLICO · SUIN — Sistema Único de Información Normativa',
    )
  })

  // Sin esto se leería "DIAN · Normograma DIAN" y "SIC · Superintendencia de Industria…"
  it('no repite la entidad cuando el portal ya la nombra', () => {
    expect(sourceLine('DIAN', 'dian')).toBe('Normograma DIAN')
    expect(sourceLine('Superfinanciera', 'superfinanciera')).toBe('Superintendencia Financiera')
  })

  it('mantiene el emisor si el portal es un agregador', () => {
    expect(sourceLine('MINISTERIO DE SALUD Y PROTECCIÓN SOCIAL', 'suin')).toContain('MINISTERIO DE SALUD')
  })

  it('sobrevive a datos incompletos', () => {
    expect(sourceLine(null, 'sic')).toBe('Superintendencia de Industria y Comercio')
    expect(sourceLine('DIAN', null)).toBe('DIAN · Fuente oficial')
    expect(sourceLine(null, null)).toBe('Fuente oficial')
  })

  it('deja pasar una fuente desconocida en vez de ocultarla', () => {
    expect(sourceLabel('minsalud')).toBe('minsalud')
  })
})
