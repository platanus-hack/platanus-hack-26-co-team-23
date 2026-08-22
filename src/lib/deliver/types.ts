import type { ChannelConfig } from '@/lib/types'

export type AlertPayload = {
  norm_title: string
  norm_url: string | null
  impact: string
  recommendation: string
  severity: 'low' | 'medium' | 'high'
}

// Single contract: each channel is a file that implements this and registers in dispatch.ts.
export interface ChannelAdapter {
  send(config: Record<string, string>, payload: AlertPayload): Promise<void>
}

export type { ChannelConfig }
