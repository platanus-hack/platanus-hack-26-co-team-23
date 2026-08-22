export const SECTORS = [
  'fintech', 'salud', 'alimentos', 'transporte', 'construccion',
  'comercio', 'tecnologia', 'datos-personales', 'laboral-general', 'tributario-general',
] as const
export type Sector = (typeof SECTORS)[number]

export const COMPANY_TYPES = ['SAS', 'SA', 'LTDA', 'persona natural'] as const

export type Obligation = { action: string; deadline: string | null }

export type Norm = {
  id: string; source: string; external_id: string; country: string
  title: string; issuer: string | null; norm_type: string | null
  published_at: string | null; url: string | null; raw_text: string | null
  summary: string | null; sectors: string[]; company_types: string[]
  obligations: Obligation[]; severity: 'info' | 'low' | 'medium' | 'high' | null
  analyzed_at: string | null
}

export const CHANNEL_TYPES = ['slack', 'google_chat', 'discord', 'teams', 'email', 'whatsapp', 'voice'] as const
export type ChannelType = (typeof CHANNEL_TYPES)[number]

export type ChannelConfig = {
  type: ChannelType
  min_severity?: 'low' | 'medium' | 'high'   // omitted = receives everything
  config: Record<string, string>              // webhook_url | address | phone, depending on the channel
}

export type Company = {
  id: string; clerk_org_id: string; clerk_user_id: string | null; name: string; company_type: string
  sectors: string[]; channels: ChannelConfig[]
  github_repo: string | null; reviewer_github: string | null
  github_installation_id: number | null   // GitHub App installation; null = fallback to GITHUB_TOKEN
}

export type Alert = {
  id: string; company_id: string; norm_id: string
  impact: string; recommendation: string; pr_url: string | null; created_at: string
}
