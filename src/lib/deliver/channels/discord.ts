import type { ChannelAdapter } from '../types'
import { formatAlertText } from '../format'

// Discord uses `content` and **bold** / *italic*.
export const discord: ChannelAdapter = {
  async send(config, payload) {
    const res = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: formatAlertText(payload).replaceAll('*', '**').replaceAll('_', '*') }),
    })
    if (!res.ok) throw new Error(`discord ${res.status}`)
  },
}
