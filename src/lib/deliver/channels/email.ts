import type { ChannelAdapter } from '../types'
import { formatAlertText } from '../format'

// Resend. For the hackathon the sandbox `from` is enough.
export const email: ChannelAdapter = {
  async send(config, payload) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'complAI <onboarding@resend.dev>',
        to: [config.address],
        subject: `⚠️ Cambio normativo: ${payload.norm_title.slice(0, 80)}`,
        text: formatAlertText(payload).replaceAll('*', '').replaceAll('_', ''),
      }),
    })
    if (!res.ok) throw new Error(`resend ${res.status}`)
  },
}
