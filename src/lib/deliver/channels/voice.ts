import type { ChannelAdapter } from '../types'

// Outbound call via Twilio with inline TwiML <Say> (text-to-speech in Spanish).
// One-way voice alert — no conversational agent needed for an alert. Free on the Twilio
// trial (verified destination numbers only; Twilio prepends a trial notice).
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!))
}

export const voice: ChannelAdapter = {
  async send(config, payload) {
    const sid = process.env.TWILIO_ACCOUNT_SID!
    const token = process.env.TWILIO_AUTH_TOKEN!
    const speech = [
      'Hola, te llamo de complAI, tu asistente de cumplimiento normativo.',
      `Se publicó una norma que te afecta: ${payload.norm_title}.`,
      `Cómo te afecta: ${payload.impact}`,
      `Nuestra recomendación: ${payload.recommendation}.`,
      'Te enviamos el detalle por escrito. Hasta pronto.',
    ].join(' ')
    const twiml = `<Response><Say voice="Polly.Mia" language="es-MX">${escapeXml(speech)}</Say></Response>`

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: 'POST',
<<<<<<< Updated upstream
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RETELL_API_KEY}` },
      body: JSON.stringify({
        from_number: process.env.RETELL_FROM_NUMBER,
        to_number: config.phone,
        override_agent_id: process.env.RETELL_AGENT_ID,
        retell_llm_dynamic_variables: {
          norm_title: payload.norm_title,
          impact: payload.impact,
          recommendation: payload.recommendation,
          // Extra context when the alert has a brief. Unused variables are ignored by
          // the agent, so this stays safe for prompts that don't reference them.
          si_no_haces_nada: payload.brief?.si_no_haces_nada ?? '',
          plazo: payload.brief?.plazo ?? '',
        },
      }),
=======
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: config.phone, From: process.env.TWILIO_FROM_NUMBER!, Twiml: twiml }),
>>>>>>> Stashed changes
    })
    if (!res.ok) throw new Error(`twilio ${res.status}: ${await res.text()}`)
  },
}
