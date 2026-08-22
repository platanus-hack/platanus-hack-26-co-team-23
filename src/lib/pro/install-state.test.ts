import { describe, it, expect, beforeAll } from 'vitest'
import { signState, verifyState, buildInstallUrl } from './install-state'

const COMPANY = '968e398b-4ae8-4517-8148-0f74ca28fbdf'

beforeAll(() => {
  process.env.GITHUB_STATE_SECRET = 'test-secret'
  process.env.GITHUB_APP_SLUG = 'complia-app'
})

describe('install state', () => {
  it('returns the companyId when the signature is valid', () => {
    expect(verifyState(signState(COMPANY))).toBe(COMPANY)
  })

  it('rejects a state with a different company glued to someone else\'s signature', () => {
    const [, signature] = signState(COMPANY).split('.')
    expect(verifyState(`otra-empresa.${signature}`)).toBeNull()
  })

  it('rejects an empty state, one with no signature, or a corrupted one', () => {
    expect(verifyState(null)).toBeNull()
    expect(verifyState(COMPANY)).toBeNull()
    expect(verifyState(`${COMPANY}.xxx`)).toBeNull()
  })

  it('builds the install URL with the signed state', () => {
    const url = new URL(buildInstallUrl(COMPANY))
    expect(url.pathname).toBe('/apps/complia-app/installations/new')
    expect(verifyState(url.searchParams.get('state'))).toBe(COMPANY)
  })
})
