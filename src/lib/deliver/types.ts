import type { ChannelConfig } from '@/lib/types'
import type { Brief } from '@/lib/alerts/brief'

export type AlertPayload = {
  norm_title: string
  norm_url: string | null
  // Who issued it and which official portal it came from — shown in every channel
  // so the reader can trace the alert back to the source.
  norm_issuer?: string | null
  norm_source?: string | null
  impact: string
  recommendation: string
  severity: 'low' | 'medium' | 'high'
  // Optional: when the alert has a brief, the message carries the four sections
  // and a link to the PDF guide. Without it the short format is used.
  brief?: Brief | null
  guide_url?: string | null
}

// Single contract: each channel is a file that implements this and registers in dispatch.ts.
export interface ChannelAdapter {
  send(config: Record<string, string>, payload: AlertPayload): Promise<void>
}

export type { ChannelConfig }
