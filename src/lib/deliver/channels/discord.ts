import type { ChannelAdapter } from '../types'
import { formatAlertText, clip } from '../format'

// Discord uses `content` and **bold** / *italic*. Hard limit: 2000 chars → clip (full detail in the PDF).
export const discord: ChannelAdapter = {
  async send(config, payload) {
    const content = clip(formatAlertText(payload).replaceAll('*', '**').replaceAll('_', '*'), 2000)
    const res = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) throw new Error(`discord ${res.status}: ${await res.text()}`)
  },
}
