import { describe, it, expect } from 'vitest'
import { parseCompliaPaths } from './complia-md'

const REPO = ['src/invoice.ts', 'src/logger.ts', 'src/tax/retencion.ts', 'README.md']

describe('parseCompliaPaths', () => {
  it('extracts only the backtick paths that exist in the repo', () => {
    const md = 'Ver `src/invoice.ts` y `src/inventado.ts`, más texto `no-una-ruta`.'
    expect(parseCompliaPaths(md, REPO)).toEqual(['src/invoice.ts'])
  })

  it('expands a backtick folder to its files', () => {
    expect(parseCompliaPaths('Todo `src/tax/` aplica.', REPO)).toEqual(['src/tax/retencion.ts'])
  })

  it('normalizes the ./ prefix and does not duplicate', () => {
    expect(parseCompliaPaths('`./src/logger.ts` y `src/logger.ts`', REPO)).toEqual(['src/logger.ts'])
  })
})
