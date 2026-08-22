import type { AlertPayload, ChannelAdapter, ChannelConfig } from './types'
import { slack } from './channels/slack'
import { googleChat } from './channels/google-chat'
import { discord } from './channels/discord'
import { teams } from './channels/teams'
import { email } from './channels/email'
import { whatsapp } from './channels/whatsapp'
import { voice } from './channels/voice'

// Channel registry. Adding a channel = new file + one line here.
export const ADAPTERS: Record<string, ChannelAdapter> = {
  slack, google_chat: googleChat, discord, teams, email, whatsapp, voice,
}

const RANK = { low: 0, medium: 1, high: 2 } as const

// Fans out to every eligible channel. min_severity lives in config (voice = high only),
// so the noise policy stays out of the adapters. Errors are isolated: one dead channel
// never blocks the others (a dispatcher must not become its own point of failure).
export async function deliverAlert(
  channels: ChannelConfig[],
  payload: AlertPayload,
  registry: Record<string, ChannelAdapter> = ADAPTERS,
): Promise<{ delivered: string[]; failed: string[] }> {
  const eligible = channels.filter(
    (c) => registry[c.type] && RANK[payload.severity] >= RANK[c.min_severity ?? 'low'],
  )
  const results = await Promise.allSettled(eligible.map((c) => registry[c.type].send(c.config, payload)))
  const delivered: string[] = []
  const failed: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') delivered.push(eligible[i].type)
    else { failed.push(eligible[i].type); console.error(`channel ${eligible[i].type} failed:`, r.reason) }
  })
  return { delivered, failed }
}
