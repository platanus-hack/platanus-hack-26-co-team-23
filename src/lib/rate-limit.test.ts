import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock of the admin client: rpc returns whatever count we tell it to
const rpc = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: () => ({ rpc }) }))

import { rateLimit } from './rate-limit'

const reqWithKey = (key: string) => new Request('https://x/api', { headers: { 'x-api-key': key } })
const reqWithIp = (ip: string) => new Request('https://x/api', { headers: { 'x-forwarded-for': ip } })

describe('rateLimit', () => {
  beforeEach(() => rpc.mockReset())

  it('ok while the count does not exceed the limit', async () => {
    rpc.mockResolvedValue({ data: 60, error: null })
    const r = await rateLimit(reqWithKey('cai_abc'), { limit: 60, windowSec: 60 })
    expect(r.ok).toBe(true)
    expect(r.remaining).toBe(0)
  })

  it('blocks (429) when the count exceeds the limit', async () => {
    rpc.mockResolvedValue({ data: 61, error: null })
    const r = await rateLimit(reqWithKey('cai_abc'), { limit: 60, windowSec: 60 })
    expect(r.ok).toBe(false)
    expect(r.retryAfter).toBe(60)
  })

  it('buckets by the key\'s hash, not the raw key', async () => {
    rpc.mockResolvedValue({ data: 1, error: null })
    await rateLimit(reqWithKey('cai_secreto'), {})
    const bucket = rpc.mock.calls[0][1].p_bucket
    expect(bucket).toMatch(/^key:[0-9a-f]{64}$/)
    expect(bucket).not.toContain('cai_secreto')
  })

  it('buckets by IP when there is no key', async () => {
    rpc.mockResolvedValue({ data: 1, error: null })
    await rateLimit(reqWithIp('1.2.3.4, 5.6.7.8'), {})
    expect(rpc.mock.calls[0][1].p_bucket).toBe('ip:1.2.3.4')
  })

  it('fail-open: if the rpc fails, it does not block the service', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const r = await rateLimit(reqWithKey('cai_abc'), { limit: 60 })
    expect(r.ok).toBe(true)
  })
})
