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

    // Prefer the brief's sharper wording when present; fall back to impact/recommendation.
    const afecta = payload.brief?.por_que_te_afecta ?? payload.impact
    const consecuencia = payload.brief?.si_no_haces_nada
    const plazo = payload.brief?.plazo
    const speech = [
      'Hola, te llamo de complAI, tu asistente de cumplimiento normativo.',
      `Se publicó una norma que te afecta: ${payload.norm_title}.`,
      `Cómo te afecta: ${afecta}`,
      consecuencia ? `Si no actúas: ${consecuencia}` : '',
      `Nuestra recomendación: ${payload.recommendation}.`,
      plazo ? `Plazo: ${plazo}.` : '',
      'Te enviamos el detalle por escrito. Hasta pronto.',
    ].filter(Boolean).join(' ')
    const twiml = `<Response><Say voice="Polly.Mia" language="es-MX">${escapeXml(speech)}</Say></Response>`

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: config.phone, From: process.env.TWILIO_FROM_NUMBER!, Twiml: twiml }),
    })
    if (!res.ok) throw new Error(`twilio ${res.status}: ${await res.text()}`)
  },
}
