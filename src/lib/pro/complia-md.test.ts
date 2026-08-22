import { describe, it, expect } from 'vitest'
import { parseCompliaPaths } from './complia-md'

const REPO = ['src/invoice.ts', 'src/logger.ts', 'src/tax/retencion.ts', 'README.md']

describe('parseCompliaPaths', () => {
  it('extrae solo las rutas en backticks que existen en el repo', () => {
    const md = 'Ver `src/invoice.ts` y `src/inventado.ts`, más texto `no-una-ruta`.'
    expect(parseCompliaPaths(md, REPO)).toEqual(['src/invoice.ts'])
  })

  it('expande una carpeta en backticks a sus archivos', () => {
    expect(parseCompliaPaths('Todo `src/tax/` aplica.', REPO)).toEqual(['src/tax/retencion.ts'])
  })

  it('normaliza el prefijo ./ y no duplica', () => {
    expect(parseCompliaPaths('`./src/logger.ts` y `src/logger.ts`', REPO)).toEqual(['src/logger.ts'])
  })
})
