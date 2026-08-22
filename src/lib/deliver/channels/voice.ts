import type { ChannelAdapter } from '../types'
import { buildSpeech, twimlFor, twimlUrl } from '../voice-script'

// Outbound call via Twilio, text-to-speech in Spanish. One-way voice alert — no
// conversational agent needed for an alert.
export const voice: ChannelAdapter = {
  async send(config, payload) {
    const sid = process.env.TWILIO_ACCOUNT_SID!
    const token = process.env.TWILIO_AUTH_TOKEN!

    // Trial accounts reject the inline `Twiml` parameter, so we point Twilio at our
    // signed endpoint instead and only fall back to inline when there is no alert id.
    const source: Record<string, string> = payload.alert_id
      ? { Url: twimlUrl(payload.alert_id) }
      : { Twiml: twimlFor(buildSpeech(payload)) }

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: config.phone, From: process.env.TWILIO_FROM_NUMBER!, ...source }),
    })
    if (!res.ok) throw new Error(`twilio ${res.status}: ${await res.text()}`)
  },
}
