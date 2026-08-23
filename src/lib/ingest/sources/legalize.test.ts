import { describe, it, expect } from 'vitest'

const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'
import { parseLegalizeCommit } from './legalize'

const REAL_COMMIT_MESSAGE = `[reform] LEY 599 DE 2000 — art. 296

Norma: LEY-599-2000
Disposición: 1663230
Fecha: 2026-07-30
Fuente: https://www.suin-juriscol.gov.co/viewDocument.asp?id=1663230

Artículos afectados: **Artículo 296.** ***FALSEDAD PERSONAL.*** El que con el fin de obtener un provecho para sí o para otro, o causar daño, sustituya o suplante a una persona o se atribuya nombre, edad, estado civil, o calidad que pueda tener efectos jurídicos, incurrirá en muita, siempre que la conducta no constituya otro delito.

Source-Id: 1663230
Source-Date: 2026-07-30
Norm-Id: LEY-599-2000`

describe('parseLegalizeCommit', () => {
  it('maps a real [reform] commit message to SourceNorm', () => {
    const row = parseLegalizeCommit(REAL_COMMIT_MESSAGE, SHA)
    expect(row).toEqual({
      external_id: 'legalize-a1b2c3d4e5f6', // the commit sha, not Source-Id: that one repeats per norm
      source: 'legalize',
      title: 'LEY 599 DE 2000 — art. 296',
      issuer: null,
      norm_type: 'ley',
      published_at: '2026-07-30',
      url: 'https://www.suin-juriscol.gov.co/viewDocument.asp?id=1663230',
      raw_text: expect.stringContaining('FALSEDAD PERSONAL'),
    })
  })

  it('skips non-reform commits (bootstrap, fix-pipeline, license, readme)', () => {
    expect(parseLegalizeCommit('Add LICENSE: MIT pipeline code + official-source data terms', SHA)).toBeNull()
    expect(parseLegalizeCommit('[fix-pipeline] Add README and funding metadata', SHA)).toBeNull()
    expect(parseLegalizeCommit('[bootstrap] seed repository', SHA)).toBeNull()
  })

  it('skips a [reform] commit with a missing trailer instead of guessing', () => {
    const withoutSourceDate = REAL_COMMIT_MESSAGE.replace('Source-Date: 2026-07-30\n', '')
    expect(parseLegalizeCommit(withoutSourceDate, SHA)).toBeNull()
  })

  it('derives norm_type from the Norm-Id prefix', () => {
    const decreto = REAL_COMMIT_MESSAGE
      .replace(/LEY-599-2000/g, 'DECRETO-410-1971')
      .replace('LEY 599 DE 2000', 'DECRETO 410 DE 1971')
    expect(parseLegalizeCommit(decreto, SHA)?.norm_type).toBe('decreto')
  })
})
