import { describe, it, expect } from 'vitest'
import { stripHtml, decodeEntities, parseSpanishDate } from './scrape'

describe('stripHtml', () => {
  it('quita tags, scripts y decodifica entidades', () => {
    expect(stripHtml('<p>Art&nbsp;1. <b>Plazo</b>:</p><script>x()</script> 2026')).toBe('Art 1. Plazo : 2026')
  })

  it('quita bloques <style>', () => {
    expect(stripHtml('<style>.a{color:red}</style><p>Texto</p>')).toBe('Texto')
  })
})

describe('decodeEntities', () => {
  it('decodifica entidades con tilde y ñ', () => {
    expect(decodeEntities('Reglamentaci&oacute;n de habeas data en Espa&ntilde;a')).toBe('Reglamentación de habeas data en España')
  })

  it('decodifica entidades numéricas', () => {
    expect(decodeEntities('a&#241;o')).toBe('año')
  })
})

describe('parseSpanishDate', () => {
  it('parsea "Mes Día, Año" con abreviatura en español', () => {
    expect(parseSpanishDate('Sep 29, 2023')).toBe('2023-09-29')
    expect(parseSpanishDate('Dic 7, 2018')).toBe('2018-12-07')
  })

  it('cae al 1ro de enero si solo hay año', () => {
    expect(parseSpanishDate('Publicado en 2026, sin fecha exacta')).toBe('2026-01-01')
  })

  it('devuelve null si no hay año reconocible', () => {
    expect(parseSpanishDate('sin fecha')).toBeNull()
  })
})
