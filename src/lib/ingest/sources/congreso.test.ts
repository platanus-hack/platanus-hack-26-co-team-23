import { describe, expect, it } from 'vitest'
import { parseCongresoDate, mapCongresoRecord } from './congreso'

describe('parseCongresoDate', () => {
  it('passes ISO dates through', () => {
    expect(parseCongresoDate('2022-07-21')).toBe('2022-07-21')
    expect(parseCongresoDate('2022-07-21T00:00:00.000')).toBe('2022-07-21')
  })
  it('reformats Colombian D/M/YYYY to ISO, padding single digits', () => {
    expect(parseCongresoDate('9/6/2018')).toBe('2018-06-09')
    expect(parseCongresoDate('10/10/2017')).toBe('2017-10-10')
  })
  it('returns null for junk / empty / NULL', () => {
    expect(parseCongresoDate('LEGISLATURA 2017')).toBeNull()
    expect(parseCongresoDate('NULL')).toBeNull()
    expect(parseCongresoDate(null)).toBeNull()
  })
})

describe('mapCongresoRecord', () => {
  it('maps a real record and marks it en_tramite', () => {
    const n = mapCongresoRecord({
      n_senado: '034/22',
      titulo: '"POR MEDIO DE LA CUAL SE MODIFICA LA LEY 1829 DE 2017"',
      autor: 'H.S: FABIAN DIAZ PLATA',
      f_presentado: '2022-07-21',
      comision: 'SEXTA',
      estado: 'PENDIENTE DISCUTIR PONENCIA PARA SEGUNDO DEBATE EN SENADO',
    })
    expect(n).not.toBeNull()
    expect(n!.status).toBe('en_tramite')
    expect(n!.source).toBe('congreso')
    expect(n!.external_id).toBe('congreso-senado-034/22')
    expect(n!.published_at).toBe('2022-07-21')
    expect(n!.title).toContain('Proyecto de Ley 034/22')
    expect(n!.title).not.toContain('"POR MEDIO') // outer quotes stripped
    expect(n!.raw_text).toContain('Estado del trámite: PENDIENTE')
  })
  it('skips header/junk rows without a title', () => {
    expect(mapCongresoRecord({ n_senado: 'LEGISLATURA 2017 - 2018' })).toBeNull()
  })
})
