import type { ChannelAdapter } from '../types'
import { formatAlertText, clip } from '../format'

// Kapso proxies the WhatsApp Cloud API: https://docs.kapso.ai/api/meta/whatsapp/messages/send-a-message
export const whatsapp: ChannelAdapter = {
  async send(config, payload) {
    const res = await fetch(
      `https://api.kapso.ai/meta/whatsapp/v24.0/${process.env.KAPSO_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.KAPSO_API_KEY! },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: config.phone,
          type: 'text',
          text: { body: clip(formatAlertText(payload).replaceAll('_', ''), 4096) },
        }),
      },
    )
    if (!res.ok) throw new Error(`kapso ${res.status}: ${await res.text()}`)
  },
}
