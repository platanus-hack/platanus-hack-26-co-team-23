import { describe, it, expect } from 'vitest'
import { parseSicRows } from './sic'

describe('parseSicRows', () => {
  it('extrae una ficha de una fila de la tabla del repositorio', () => {
    const html = `
      <table>
        <tr><th>Tipo</th><th>Tema</th><th>Nombre</th><th>Descripción</th><th>Fecha</th></tr>
        <tr>
          <td>Resolución</td>
          <td>Protección al consumidor</td>
          <td>Resolución 12345 de 2026</td>
          <td>Por la cual se sanciona a una empresa por publicidad engañosa</td>
          <td>Sep 29, 2023</td>
          <td><a href="https://www.sic.gov.co/files/res-12345.pdf">Descargar</a></td>
        </tr>
      </table>
    `
    const items = parseSicRows(html, 'resolucion', 10)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      external_id: 'sic-resolucion-12345-de-2026',
      source: 'sic',
      issuer: 'SIC',
      norm_type: 'resolucion',
      published_at: '2023-09-29',
      url: 'https://www.sic.gov.co/files/res-12345.pdf',
    })
    expect(items[0].title).toContain('Resolución 12345 de 2026')
    expect(items[0].raw_text).toContain('Protección al consumidor')
  })

  it('ignora filas sin suficientes columnas o sin nombre', () => {
    const html = '<table><tr><th>Tipo</th><th>Tema</th></tr><tr><td>x</td><td>y</td><td></td><td>z</td><td>w</td></tr></table>'
    expect(parseSicRows(html, 'circular', 10)).toEqual([])
  })

  it('respeta el límite', () => {
    const row = (n: number) => `<tr><td>t</td><td>tema</td><td>Norma ${n}</td><td>desc</td><td>2026</td></tr>`
    const html = `<table>${row(1)}${row(2)}${row(3)}</table>`
    expect(parseSicRows(html, 'circular', 2)).toHaveLength(2)
  })
})
