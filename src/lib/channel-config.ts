import type { ChannelType } from './types'

/**
 * The single config field each channel needs, and how to validate it.
 *
 * This map is the contract between the settings form and the delivery adapters
 * (`src/lib/deliver/channels/*`): whatever key appears here is the key the adapter
 * reads. Keeping it in one place stops the form from saving `phone` while the
 * adapter looks for `address`.
 */
export const CHANNEL_FIELD: Record<ChannelType, 'webhook_url' | 'address' | 'phone'> = {
  slack: 'webhook_url',
  google_chat: 'webhook_url',
  discord: 'webhook_url',
  teams: 'webhook_url',
  email: 'address',
  whatsapp: 'phone',
  voice: 'phone',
}

export const CHANNEL_LABELS: Record<ChannelType, string> = {
  slack: 'Slack',
  google_chat: 'Google Chat',
  discord: 'Discord',
  teams: 'Microsoft Teams',
  email: 'Email',
  whatsapp: 'WhatsApp',
  voice: 'Llamada de voz',
}

/** WhatsApp (Kapso) and Retell need E.164: no spaces, dashes or parentheses. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '')
}

/**
 * Validates the value the user typed for a channel. Returns the error message
 * to show, or null when it's fine. Runs server-side in the action, which is the
 * trust boundary — a bad value here means the alert silently never arrives.
 */
export function validateChannelValue(type: ChannelType, raw: string): string | null {
  const label = CHANNEL_LABELS[type]
  const value = raw?.trim() ?? ''
  if (!value) return `${label}: falta completar el campo o desactiva el canal.`

  switch (CHANNEL_FIELD[type]) {
    case 'webhook_url': {
      let url: URL
      try {
        url = new URL(value)
      } catch {
        return `${label}: la URL del webhook no es válida.`
      }
      if (url.protocol !== 'https:') return `${label}: la URL del webhook debe empezar con https://`
      return null
    }
    case 'address':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : `${label}: el correo no es válido.`
    case 'phone':
      return /^\+\d{7,15}$/.test(normalizePhone(value))
        ? null
        : `${label}: el número debe ir en formato internacional, por ejemplo +573001234567.`
  }
}
