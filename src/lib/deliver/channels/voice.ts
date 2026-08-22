import type { ChannelAdapter } from '../types'

// Retell places the outbound call; dynamic variables are injected into the agent's prompt.
// RETELL_FROM_NUMBER is a number connected to Retell via a Twilio SIP trunk — that's what
// lets Retell reach Colombia (Retell-managed numbers don't support CO as a destination).
// Note: the destination (config.phone) must differ from RETELL_FROM_NUMBER — Retell rejects from==to.
export const voice: ChannelAdapter = {
  async send(config, payload) {
    const res = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RETELL_API_KEY}` },
      body: JSON.stringify({
        from_number: process.env.RETELL_FROM_NUMBER,
        to_number: config.phone,
        override_agent_id: process.env.RETELL_AGENT_ID,
        retell_llm_dynamic_variables: {
          norm_title: payload.norm_title,
          impact: payload.impact,
          recommendation: payload.recommendation,
          si_no_haces_nada: payload.brief?.si_no_haces_nada ?? '',
          plazo: payload.brief?.plazo ?? '',
        },
      }),
    })
    if (!res.ok) throw new Error(`retell ${res.status}: ${await res.text()}`)
  },
}
