import type { ChannelAdapter } from '../types'
import { formatAlertText } from '../format'

export const slack: ChannelAdapter = {
  async send(config, payload) {
    const res = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: formatAlertText(payload) }),
    })
    if (!res.ok) throw new Error(`slack ${res.status}`)
  },
}
