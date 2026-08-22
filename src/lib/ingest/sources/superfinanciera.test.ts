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

describe('parseSfcListing — fecha real', () => {
  const rowHtml = (num: string, fecha: string) => `
    <table><tr><th>Número</th><th>Fecha</th><th>Descripción</th></tr>
    <tr><td><a href="/loader.php?idFile=1">${num}</a></td><td>${fecha}</td>
    <td>Depura la Circular Básica Contable y expide la nueva CBF</td></tr></table>`

  it('combina la columna Fecha (sin anio) con el anio de la pagina', () => {
    expect(parseSfcListing(rowHtml('006', 'Mayo 11'), '2026')[0].published_at).toBe('2026-05-11')
    expect(parseSfcListing(rowHtml('022', 'Diciembre 30'), '2025')[0].published_at).toBe('2025-12-30')
  })

  it('cae al 1-ene si la columna Fecha viene vacia', () => {
    expect(parseSfcListing(rowHtml('001', ''), '2026')[0].published_at).toBe('2026-01-01')
  })

  it('el anio corriente NO se pierde: se recorta por fecha, no por orden de pagina', () => {
    // Regresion del bug de Object.entries: 2025 se recorria primero y el slice descartaba 2026.
    const de2026 = parseSfcListing(rowHtml('006', 'Mayo 11'), '2026')
    const de2025 = parseSfcListing(rowHtml('022', 'Diciembre 30'), '2025')
    const masNuevas = [...de2025, ...de2026]
      .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
      .slice(0, 1)
    expect(masNuevas[0].external_id).toBe('sfc-circular-externa-006-2026')
  })
})
