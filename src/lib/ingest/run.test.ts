import { describe, expect, it } from 'vitest'
import { repairTitle } from './run'

describe('repairTitle', () => {
  it('splices one letter per � in order — any word, no dictionary', () => {
    expect(repairTitle('COMISI�N', ['Ó'])).toBe('COMISIÓN')
    expect(repairTitle('ART�CULO 522 DEL C�DIGO', ['Í', 'Ó'])).toBe('ARTÍCULO 522 DEL CÓDIGO')
  })
  it('never restructures — the prefix and everything else stay put', () => {
    expect(repairTitle('Proyecto de Ley 339/23 — LEGISLACI�N', ['Ó'])).toBe(
      'Proyecto de Ley 339/23 — LEGISLACIÓN',
    )
  })
  it('leaves the title untouched when the count does not match or there are no holes', () => {
    expect(repairTitle('COMISI�N', ['Ó', 'Í'])).toBe('COMISI�N') // model miscounted → don't guess
    expect(repairTitle('COMISI�N', undefined)).toBe('COMISI�N')
    expect(repairTitle('SIN ACENTOS', ['Ó'])).toBe('SIN ACENTOS')
  })
})
