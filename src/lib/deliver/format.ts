import type { AlertPayload } from './types'
import { sourceLine } from '@/lib/sources'

// User-facing copy stays in Spanish (target audience is Spanish-speaking companies).
const EMOJI: Record<string, string> = { high: '🔴', medium: '🟠', low: '🟡' }

const FOOTER = '_complAI · esto no constituye asesoría jurídica_'

export function formatAlertText(p: AlertPayload): string {
  const origin = sourceLine(p.norm_issuer, p.norm_source)
  const head = [
    `${EMOJI[p.severity]} *Cambio normativo que te afecta*`,
    `*${p.norm_title}*`,
    `*Fuente:* ${origin}${p.norm_url ? `\n${p.norm_url}` : ''}`,
  ]

  // Short format: no brief yet (or the alert predates it).
  if (!p.brief) {
    return [...head, `*Cómo te afecta:* ${p.impact}`, `*Qué hacer:* ${p.recommendation}`, FOOTER].join('\n\n')
  }

  const { que_cambio, por_que_te_afecta, si_no_haces_nada, pasos, plazo } = p.brief
  return [
    ...head,
    `*Qué cambió:* ${que_cambio}`,
    `*Por qué te afecta:* ${por_que_te_afecta}`,
    `*Si no haces nada:* ${si_no_haces_nada}`,
    `*Qué deberías hacer:*\n${pasos.map((s, i) => `${i + 1}. ${s.titulo} (${s.responsable})`).join('\n')}`,
    ...(plazo ? [`*Plazo:* ${plazo}`] : []),
    ...(p.guide_url ? [`📄 Guía completa en PDF: ${p.guide_url}`] : []),
    FOOTER,
  ].join('\n\n')
}
