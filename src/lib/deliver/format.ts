import type { AlertPayload } from './types'

// User-facing copy stays in Spanish (target audience is Spanish-speaking companies).
const EMOJI: Record<string, string> = { high: '🔴', medium: '🟠', low: '🟡' }

export function formatAlertText(p: AlertPayload): string {
  return [
    `${EMOJI[p.severity]} *Cambio normativo que te afecta*`,
    `*${p.norm_title}*${p.norm_url ? `\n${p.norm_url}` : ''}`,
    `*Cómo te afecta:* ${p.impact}`,
    `*Qué hacer:* ${p.recommendation}`,
    '_complAI · esto no constituye asesoría jurídica_',
  ].join('\n\n')
}
