import { describe, it, expect } from 'vitest'
import { parseSfcListing } from './superfinanciera'

describe('parseSfcListing', () => {
  it('extrae circulares de la tabla del listado anual', () => {
    const html = `
      <table>
        <tr><th>Número</th><th>Fecha</th><th>Descripción</th><th>Boletín</th></tr>
        <tr>
          <td>004</td><td>15/01/2026</td>
          <td>Adopción de la nueva Circular Básica Financiera</td>
          <td><a href="loader.php?lServicio=Tools2&lTipo=descargas&lFuncion=descargar&idFile=123">PDF</a></td>
        </tr>
        <tr>
          <td>002</td><td>10/01/2026</td>
          <td>Modifica los plazos de implementación del MURIC</td>
          <td>Sin archivo</td>
        </tr>
      </table>
    `
    const items = parseSfcListing(html, '2026')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      external_id: 'sfc-circular-externa-004-2026',
      source: 'superfinanciera',
      title: expect.stringContaining('Circular Externa 004 de 2026'),
      norm_type: 'circular',
      issuer: 'Superfinanciera',
      url: 'https://www.superfinanciera.gov.co/loader.php?lServicio=Tools2&lTipo=descargas&lFuncion=descargar&idFile=123',
    })
    expect(items[0].raw_text).toContain('Circular Básica Financiera')
    expect(items[1]).toMatchObject({
      external_id: 'sfc-circular-externa-002-2026',
      url: 'https://www.superfinanciera.gov.co/publicaciones/10115974/circulares-externas-2026/',
    })
  })

  it('ignora filas de encabezado sin número de circular', () => {
    const html = '<table><tr><th>Número</th><th>Fecha</th><th>Descripción</th></tr></table>'
    expect(parseSfcListing(html, '2026')).toEqual([])
  })
})
