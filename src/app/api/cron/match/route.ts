import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { normsForProfile } from '@/lib/norms-queries'
import { generateImpact } from '@/lib/deliver/impact'
import { deliverAlert } from '@/lib/deliver/dispatch'
import type { ChannelConfig } from '@/lib/types'

export const maxDuration = 300

type Company = {
  id: string; name: string; company_type: string
  sectors: string[]; channels: ChannelConfig[]
}

// POST for manual curl; GET for Vercel Cron (it invokes via GET with the
// Authorization: Bearer $CRON_SECRET header when CRON_SECRET is set).
async function handle(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = supabaseAdmin()
  const { data: companies } = await db.from('companies')
    .select('id, name, company_type, sectors, channels')
  const { data: existing } = await db.from('alerts').select('company_id, norm_id')
  const seen = new Set((existing ?? []).map((a) => `${a.company_id}:${a.norm_id}`))

  let alertsCreated = 0
  const channelStats: Record<string, number> = {}

  for (const company of (companies ?? []) as Company[]) {
    if (!company.sectors?.length) continue // no profile → nothing to match

    // Reuse the matching behind the `normas_que_me_aplican` MCP tool.
    const applicable = await normsForProfile({
      tipoEmpresa: company.company_type,
      sectores: company.sectors,
      severidadMin: 'low',
      limit: 50,
    })
    if (!applicable.length) continue

    // Resolve external_id → internal uuid (alerts.norm_id is a FK to norms.id).
    const { data: idRows } = await db.from('norms')
      .select('id, external_id').in('external_id', applicable.map((n) => n.external_id))
    const idByExt = new Map((idRows ?? []).map((r) => [r.external_id, r.id]))

    for (const norm of applicable) {
      const normId = idByExt.get(norm.external_id)
      if (!normId || seen.has(`${company.id}:${normId}`)) continue

      const { impact, recommendation } = await generateImpact(company, norm)
      await db.from('alerts').insert({ company_id: company.id, norm_id: normId, impact, recommendation })
      seen.add(`${company.id}:${normId}`)
      alertsCreated++

      const { delivered } = await deliverAlert(company.channels ?? [], {
        norm_title: norm.title, norm_url: norm.url, impact, recommendation,
        severity: (norm.severity ?? 'low') as 'low' | 'medium' | 'high',
      })
      delivered.forEach((t) => { channelStats[t] = (channelStats[t] ?? 0) + 1 })
    }
  }

  return NextResponse.json({ companies: companies?.length ?? 0, alertsCreated, channels: channelStats })
}

export { handle as GET, handle as POST }
