import { createHmac, timingSafeEqual } from 'node:crypto'
import type { AlertPayload } from './types'
import { appUrl } from '@/lib/app-url'

/**
 * The spoken alert and the TwiML that wraps it.
 *
 * Twilio can take the TwiML two ways: inline (`Twiml` param) or by fetching a URL
 * (`Url`). Trial accounts reject the inline one — "trial accounts have limited
 * parameter access" — so we serve it from `/api/alerts/[id]/twiml` instead.
 */
export function buildSpeech(p: Pick<AlertPayload, 'norm_title' | 'impact' | 'recommendation' | 'brief'>): string {
  const afecta = p.brief?.por_que_te_afecta ?? p.impact
  const consecuencia = p.brief?.si_no_haces_nada
  const plazo = p.brief?.plazo
  return [
    'Hola, te llamo de complAI, tu asistente de cumplimiento normativo.',
    `Se publicó una norma que te afecta: ${p.norm_title}.`,
    `Cómo te afecta: ${afecta}`,
    consecuencia ? `Si no actúas: ${consecuencia}` : '',
    `Nuestra recomendación: ${p.recommendation}.`,
    plazo ? `Plazo: ${plazo}.` : '',
    'Te enviamos el detalle por escrito. Hasta pronto.',
  ]
    .filter(Boolean)
    .join(' ')
}

const escapeXml = (s: string): string =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!)

export const twimlFor = (speech: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Mia" language="es-MX">${escapeXml(speech)}</Say></Response>`

/**
 * Twilio fetches the TwiML unauthenticated, so the URL carries a signature: without
 * it, anyone who guessed an alert id could read that company's compliance findings.
 */
const secret = () => {
  const s = process.env.CRON_SECRET
  if (!s) throw new Error('falta CRON_SECRET')
  return s
}
const sign = (alertId: string) => createHmac('sha256', secret()).update(`twiml:${alertId}`).digest('base64url')

export const twimlUrl = (alertId: string) =>
  `${appUrl()}/api/alerts/${alertId}/twiml?sig=${sign(alertId)}`

export function verifyTwimlSig(alertId: string, sig: string | null): boolean {
  if (!sig) return false
  const given = Buffer.from(sig)
  const expected = Buffer.from(sign(alertId))
  return given.length === expected.length && timingSafeEqual(given, expected)
}
