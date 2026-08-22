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
          // Extra context when the alert has a brief. Unused variables are ignored by
          // the agent, so this stays safe for prompts that don't reference them.
          si_no_haces_nada: payload.brief?.si_no_haces_nada ?? '',
          plazo: payload.brief?.plazo ?? '',
        },
      }),
    })
    if (!res.ok) throw new Error(`retell ${res.status}: ${await res.text()}`)
  },
}
