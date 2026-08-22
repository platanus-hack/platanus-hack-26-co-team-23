import { describe, it, expect } from 'vitest'
import { parseSfcListing } from './superfinanciera'

describe('parseSfcListing', () => {
  it('extracts circulars from the annual listing table', () => {
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

  it('ignores header rows with no circular number', () => {
    const html = '<table><tr><th>Número</th><th>Fecha</th><th>Descripción</th></tr></table>'
    expect(parseSfcListing(html, '2026')).toEqual([])
  })
})

describe('parseSfcListing — real date', () => {
  const rowHtml = (num: string, fecha: string) => `
    <table><tr><th>Número</th><th>Fecha</th><th>Descripción</th></tr>
    <tr><td><a href="/loader.php?idFile=1">${num}</a></td><td>${fecha}</td>
    <td>Depura la Circular Básica Contable y expide la nueva CBF</td></tr></table>`

  it('combines the Fecha column (no year) with the page\'s year', () => {
    expect(parseSfcListing(rowHtml('006', 'Mayo 11'), '2026')[0].published_at).toBe('2026-05-11')
    expect(parseSfcListing(rowHtml('022', 'Diciembre 30'), '2025')[0].published_at).toBe('2025-12-30')
  })

  it('falls back to Jan 1st if the Fecha column is empty', () => {
    expect(parseSfcListing(rowHtml('001', ''), '2026')[0].published_at).toBe('2026-01-01')
  })

  it('does NOT lose the current year: trims by date, not by page order', () => {
    // Regression of the Object.entries bug: 2025 was walked first and the slice dropped 2026.
    const de2026 = parseSfcListing(rowHtml('006', 'Mayo 11'), '2026')
    const de2025 = parseSfcListing(rowHtml('022', 'Diciembre 30'), '2025')
    const newest = [...de2025, ...de2026]
      .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
      .slice(0, 1)
    expect(newest[0].external_id).toBe('sfc-circular-externa-006-2026')
  })
})
