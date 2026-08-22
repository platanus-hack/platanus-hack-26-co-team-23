import { describe, it, expect } from 'vitest'
import { parseAnalysis } from './analyze'

describe('parseAnalysis', () => {
  it('extrae y valida el JSON de la respuesta del modelo', () => {
    const llmText = 'Aquí está el análisis:\n{"summary":"Nueva obligación de reporte.","sectors":["fintech"],"company_types":["SAS"],"obligations":[{"action":"Enviar reporte mensual","deadline":"2026-10-01"}],"severity":"high"}'
    const a = parseAnalysis(llmText)
    expect(a.severity).toBe('high')
    expect(a.sectors).toEqual(['fintech'])
  })

  it('rechaza sectores fuera de la taxonomía', () => {
    expect(() => parseAnalysis('{"summary":"x","sectors":["criptogamer"],"company_types":[],"obligations":[],"severity":"low"}')).toThrow()
  })

  it('lanza error si no hay JSON en la respuesta', () => {
    expect(() => parseAnalysis('no hay nada aquí')).toThrow('sin JSON en la respuesta')
  })
})
