import type { ChannelAdapter } from '../types'
import { formatAlertText, clip } from '../format'

// Google Chat text limit: 4096 chars → clip (full detail in the PDF).
export const googleChat: ChannelAdapter = {
  async send(config, payload) {
    const res = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clip(formatAlertText(payload), 4096) }),
    })
    if (!res.ok) throw new Error(`google_chat ${res.status}: ${await res.text()}`)
  },
}
