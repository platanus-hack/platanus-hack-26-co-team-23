import { describe, it, expect, beforeAll } from 'vitest'
import { signState, verifyState, buildInstallUrl } from './install-state'

const COMPANY = '968e398b-4ae8-4517-8148-0f74ca28fbdf'

beforeAll(() => {
  process.env.GITHUB_STATE_SECRET = 'secreto-de-prueba'
  process.env.GITHUB_APP_SLUG = 'complia-app'
})

describe('state de instalación', () => {
  it('devuelve el companyId cuando la firma es válida', () => {
    expect(verifyState(signState(COMPANY))).toBe(COMPANY)
  })

  it('rechaza un state con otra empresa pegada a una firma ajena', () => {
    const [, firma] = signState(COMPANY).split('.')
    expect(verifyState(`otra-empresa.${firma}`)).toBeNull()
  })

  it('rechaza state vacío, sin firma o con firma corrupta', () => {
    expect(verifyState(null)).toBeNull()
    expect(verifyState(COMPANY)).toBeNull()
    expect(verifyState(`${COMPANY}.xxx`)).toBeNull()
  })

  it('arma la URL de instalación con el state firmado', () => {
    const url = new URL(buildInstallUrl(COMPANY))
    expect(url.pathname).toBe('/apps/complia-app/installations/new')
    expect(verifyState(url.searchParams.get('state'))).toBe(COMPANY)
  })
})
