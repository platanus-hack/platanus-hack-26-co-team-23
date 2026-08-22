import type { ChannelAdapter } from '../types'
import { formatAlertText } from '../format'

// Teams incoming webhook: {text} renders markdown; bold is **.
export const teams: ChannelAdapter = {
  async send(config, payload) {
    const res = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: formatAlertText(payload).replaceAll('*', '**') }),
    })
    if (!res.ok) throw new Error(`teams ${res.status}`)
  },
}
