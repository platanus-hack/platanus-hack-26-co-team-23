import { describe, it, expect } from 'vitest'
import { deliverAlert } from './dispatch'
import type { AlertPayload, ChannelAdapter } from './types'

const payload: AlertPayload = { norm_title: 'X', norm_url: null, impact: 'i', recommendation: 'r', severity: 'medium' }

describe('deliverAlert', () => {
  it('delivers to eligible channels and isolates failures (one dead channel does not block others)', async () => {
    const calls: string[] = []
    const registry: Record<string, ChannelAdapter> = {
      ok: { send: async () => { calls.push('ok') } },
      boom: { send: async () => { throw new Error('down') } },
    }
    const res = await deliverAlert(
      [{ type: 'ok', config: {} }, { type: 'boom', config: {} }] as never, payload, registry,
    )
    expect(calls).toEqual(['ok'])
    expect(res.delivered).toEqual(['ok'])
    expect(res.failed).toEqual(['boom'])
  })

  it('respects min_severity (voice does not ring for a medium norm)', async () => {
    const calls: string[] = []
    const registry: Record<string, ChannelAdapter> = { voice: { send: async () => { calls.push('voice') } } }
    await deliverAlert([{ type: 'voice', min_severity: 'high', config: {} }] as never, payload, registry)
    expect(calls).toEqual([])
  })

  it('ignores channels with no registered adapter', async () => {
    const res = await deliverAlert([{ type: 'fax', config: {} }] as never, payload, {})
    expect(res).toEqual({ delivered: [], failed: [] })
  })
})
