import type { ChannelAdapter } from '../types'

// Retell places the outbound call; dynamic variables are injected into the agent's prompt:
// https://docs.retellai.com/api-references/create-phone-call
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
        },
      }),
    })
    if (!res.ok) throw new Error(`retell ${res.status}: ${await res.text()}`)
  },
}
