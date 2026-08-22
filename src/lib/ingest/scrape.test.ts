import { describe, it, expect } from 'vitest'
import { stripHtml, decodeEntities, parseSpanishDate } from './scrape'

describe('stripHtml', () => {
  it('strips tags, scripts, and decodes entities', () => {
    expect(stripHtml('<p>Art&nbsp;1. <b>Plazo</b>:</p><script>x()</script> 2026')).toBe('Art 1. Plazo : 2026')
  })

  it('strips <style> blocks', () => {
    expect(stripHtml('<style>.a{color:red}</style><p>Texto</p>')).toBe('Texto')
  })
})

describe('decodeEntities', () => {
  it('decodes accented and ñ entities', () => {
    expect(decodeEntities('Reglamentaci&oacute;n de habeas data en Espa&ntilde;a')).toBe('Reglamentación de habeas data en España')
  })

  it('decodes numeric entities', () => {
    expect(decodeEntities('a&#241;o')).toBe('año')
  })
})

describe('parseSpanishDate', () => {
  it('parses "Month Day, Year" with a Spanish abbreviation', () => {
    expect(parseSpanishDate('Sep 29, 2023')).toBe('2023-09-29')
    expect(parseSpanishDate('Dic 7, 2018')).toBe('2018-12-07')
  })

  it('falls back to January 1st if only a year is present', () => {
    expect(parseSpanishDate('Publicado en 2026, sin fecha exacta')).toBe('2026-01-01')
  })

  it('returns null if no recognizable year is present', () => {
    expect(parseSpanishDate('sin fecha')).toBeNull()
  })
})
