import { describe, it, expect, vi, afterEach } from 'vitest'
import { mapConsejoDeEstadoRow, extractRows, croma } from './croma'

describe('mapConsejoDeEstadoRow', () => {
  it('maps a row per the documented field names', () => {
    const row = mapConsejoDeEstadoRow({
      radicado: '11001-03-27-000-2023-00045-00',
      tipo: 'SENTENCIA',
      seccion: 'Sección Cuarta',
      fecha: '2026-06-12',
      ponente: 'Julio Roberto Piza Rodríguez',
      norma_demandada: 'Decreto 1625 de 2016, art. 1.6.1.13.2.31',
      demandante: 'Empresa XYZ S.A.S.',
      url: 'https://www.consejodeestado.gov.co/providencia/xyz',
      es_unificacion: true,
    })
    expect(row).toEqual({
      external_id: 'croma-ce-11001-03-27-000-2023-00045-00',
      source: 'croma',
      title: 'SENTENCIA 11001-03-27-000-2023-00045-00 — Consejo de Estado (Sección Cuarta)',
      issuer: 'Consejo de Estado',
      norm_type: 'sentencia',
      published_at: '2026-06-12',
      url: 'https://www.consejodeestado.gov.co/providencia/xyz',
      raw_text: expect.stringContaining('unificación'),
    })
  })

  it('returns null without a radicado or a fecha', () => {
    expect(mapConsejoDeEstadoRow({ fecha: '2026-01-01' })).toBeNull()
    expect(mapConsejoDeEstadoRow({ radicado: '123' })).toBeNull()
  })
})

describe('extractRows', () => {
  it('finds the row array regardless of its key name', () => {
    expect(extractRows({ total: 1, results: [{ radicado: '1' }] })).toEqual([{ radicado: '1' }])
    expect(extractRows({ total: 1, rows: [{ radicado: '2' }] })).toEqual([{ radicado: '2' }])
    expect(extractRows({ total: 1, data: [{ radicado: '3' }] })).toEqual([{ radicado: '3' }])
  })

  it('returns an empty array for a shape with no row array', () => {
    expect(extractRows({ total: 0 })).toEqual([])
    expect(extractRows(null)).toEqual([])
  })
})

describe('croma.fetch', () => {
  const ORIGINAL_KEY = process.env.CROMA_API_KEY
  afterEach(() => {
    process.env.CROMA_API_KEY = ORIGINAL_KEY
    vi.unstubAllGlobals()
  })

  it('fails fast without a provisioned API key, so ingestAll marks it down instead of crashing', async () => {
    delete process.env.CROMA_API_KEY
    await expect(croma.fetch(10)).rejects.toThrow('CROMA_API_KEY not set')
  })

  it('sends the bearer key and a bounded per_page, and sorts the result by real date', async () => {
    process.env.CROMA_API_KEY = 'croma_test_123'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { radicado: 'A', fecha: '2026-01-01' },
          { radicado: 'B', fecha: '2026-06-01' },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const rows = await croma.fetch(5)
    expect(rows.map((r) => r.external_id)).toEqual(['croma-ce-B', 'croma-ce-A']) // most recent first

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.croma.run/co/consejo-estado/search/v1')
    expect(opts.headers.Authorization).toBe('Bearer croma_test_123')
    expect(JSON.parse(opts.body).per_page).toBe(5)
  })
})
