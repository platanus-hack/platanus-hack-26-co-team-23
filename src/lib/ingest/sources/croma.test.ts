import { describe, it, expect, vi, afterEach } from 'vitest'
import { mapConsejoDeEstadoRow, extractRows, croma } from './croma'

describe('mapConsejoDeEstadoRow', () => {
  it('maps a real row (verified live against api.croma.run)', () => {
    const row = mapConsejoDeEstadoRow({
      radicado: '15001-23-33-000-2015-00649-01',
      tipo: 'SENTENCIA',
      seccion: 'SECCIÓN SEGUNDA',
      fecha: '2022-02-24',
      ponente: 'CÉSAR PALOMINO CORTÉS',
      demandante: 'LUIS ALBERTO ECHEVERRÍA CASTILLO',
      demandado: 'ADMINISTRADORA COLOMBIANA DE PENSIONES – COLPENSIONES',
      norma_demandada: null,
      descriptores: ['PENSIÓN ORDINARIA DE JUBILACIÓN', 'RÉGIMEN DE TRANSICIÓN'],
      es_unificacion: false,
      es_extension: false,
      url: 'https://servicios.consejodeestado.gov.co/WebRelatoria/FileReferenceServlet?corp=ce&ext=html&file=2193853',
    })
    expect(row).toEqual({
      external_id: 'croma-ce-15001-23-33-000-2015-00649-01',
      source: 'croma',
      title: 'SENTENCIA 15001-23-33-000-2015-00649-01 — Consejo de Estado (SECCIÓN SEGUNDA)',
      issuer: 'Consejo de Estado',
      norm_type: 'sentencia',
      published_at: '2022-02-24',
      url: 'https://servicios.consejodeestado.gov.co/WebRelatoria/FileReferenceServlet?corp=ce&ext=html&file=2193853',
      raw_text: expect.stringContaining('RÉGIMEN DE TRANSICIÓN'),
    })
  })

  it('joins multiple descriptores with a semicolon', () => {
    const row = mapConsejoDeEstadoRow({ radicado: '1', fecha: '2022-01-01', descriptores: ['A', 'B'] })
    expect(row?.raw_text).toContain('Descriptores: A; B')
  })

  it('returns null without a radicado or a fecha', () => {
    expect(mapConsejoDeEstadoRow({ fecha: '2026-01-01' })).toBeNull()
    expect(mapConsejoDeEstadoRow({ radicado: '123' })).toBeNull()
  })
})

describe('extractRows', () => {
  it('finds the row array nested under data.results — the real shape, verified live', () => {
    expect(extractRows({ data: { total: 1, results: [{ radicado: '1' }] } })).toEqual([{ radicado: '1' }])
  })

  it('also accepts the row array at the top level, in case the API stops nesting it', () => {
    expect(extractRows({ total: 1, results: [{ radicado: '1' }] })).toEqual([{ radicado: '1' }])
    expect(extractRows({ rows: [{ radicado: '2' }] })).toEqual([{ radicado: '2' }])
  })

  it('returns an empty array for a shape with no row array', () => {
    expect(extractRows({ data: { total: 0 } })).toEqual([])
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

  it('sends the bearer key and a bounded per_page, unwraps data.results, and sorts by real date', async () => {
    process.env.CROMA_API_KEY = 'croma_test_123'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          results: [
            { radicado: 'A', fecha: '2022-01-01' },
            { radicado: 'B', fecha: '2022-06-01' },
          ],
        },
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
