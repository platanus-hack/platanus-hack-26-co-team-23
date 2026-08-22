import { describe, it, expect } from 'vitest'
import { parseAnalysis } from './analyze'

describe('parseAnalysis', () => {
  it('extracts and validates the JSON from the model response', () => {
    const llmText = 'Aquí está el análisis:\n{"summary":"Nueva obligación de reporte.","sectors":["fintech"],"company_types":["SAS"],"obligations":[{"action":"Enviar reporte mensual","deadline":"2026-10-01"}],"severity":"high"}'
    const a = parseAnalysis(llmText)
    expect(a.severity).toBe('high')
    expect(a.sectors).toEqual(['fintech'])
  })

  it('rejects sectors outside the taxonomy', () => {
    expect(() => parseAnalysis('{"summary":"x","sectors":["criptogamer"],"company_types":[],"obligations":[],"severity":"low"}')).toThrow()
  })

  it('throws if there is no JSON in the response', () => {
    expect(() => parseAnalysis('no hay nada aquí')).toThrow('no JSON in the response')
  })
})
