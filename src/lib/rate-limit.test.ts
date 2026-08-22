import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock del cliente admin: rpc devuelve el conteo que le digamos
const rpc = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: () => ({ rpc }) }))

import { rateLimit } from './rate-limit'

const reqWithKey = (key: string) => new Request('https://x/api', { headers: { 'x-api-key': key } })
const reqWithIp = (ip: string) => new Request('https://x/api', { headers: { 'x-forwarded-for': ip } })

describe('rateLimit', () => {
  beforeEach(() => rpc.mockReset())

  it('ok mientras el conteo no supere el límite', async () => {
    rpc.mockResolvedValue({ data: 60, error: null })
    const r = await rateLimit(reqWithKey('cai_abc'), { limit: 60, windowSec: 60 })
    expect(r.ok).toBe(true)
    expect(r.remaining).toBe(0)
  })

  it('bloquea (429) cuando el conteo supera el límite', async () => {
    rpc.mockResolvedValue({ data: 61, error: null })
    const r = await rateLimit(reqWithKey('cai_abc'), { limit: 60, windowSec: 60 })
    expect(r.ok).toBe(false)
    expect(r.retryAfter).toBe(60)
  })

  it('bucket por hash de la key, no por la key cruda', async () => {
    rpc.mockResolvedValue({ data: 1, error: null })
    await rateLimit(reqWithKey('cai_secreto'), {})
    const bucket = rpc.mock.calls[0][1].p_bucket
    expect(bucket).toMatch(/^key:[0-9a-f]{64}$/)
    expect(bucket).not.toContain('cai_secreto')
  })

  it('bucket por IP cuando no hay key', async () => {
    rpc.mockResolvedValue({ data: 1, error: null })
    await rateLimit(reqWithIp('1.2.3.4, 5.6.7.8'), {})
    expect(rpc.mock.calls[0][1].p_bucket).toBe('ip:1.2.3.4')
  })

  it('fail-open: si el rpc falla, no bloquea el servicio', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const r = await rateLimit(reqWithKey('cai_abc'), { limit: 60 })
    expect(r.ok).toBe(true)
  })
})
