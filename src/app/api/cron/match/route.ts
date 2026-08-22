import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { normsForProfile } from '@/lib/norms-queries'
import { deliverAlert } from '@/lib/deliver/dispatch'
import { generateBrief, briefToAlertFields } from '@/lib/alerts/brief'
import { guideUrl } from '@/lib/app-url'
import type { ChannelConfig } from '@/lib/types'

export const maxDuration = 300

// Each new alert costs one LLM call (generateBrief) + channel dispatch. Cap per run so we
// don't blow maxDuration; dedup makes it resumable, so following runs (or the daily cron)
// drain the rest. In steady state only a few norms are new per day, well under the cap.
const MAX_NEW_ALERTS_PER_RUN = 20
// Alerts processed concurrently. The slow part (brief + dispatch) runs in parallel across
// this many workers instead of one-at-a-time; 5 keeps us under Anthropic/channel rate limits.
const CONCURRENCY = 5

type Company = {
  id: string; name: string; company_type: string
  sectors: string[]; channels: ChannelConfig[]
}
type Norm = Awaited<ReturnType<typeof normsForProfile>>[number]
type WorkItem = { company: Company; norm: Norm; normId: string }

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

  // Phase 1 — build the work list (fast DB queries only). Cap here, before the expensive work.
  const work: WorkItem[] = []
  let capped = false
  for (const company of (companies ?? []) as Company[]) {
    if (work.length >= MAX_NEW_ALERTS_PER_RUN) { capped = true; break }
    if (!company.sectors?.length) continue // no profile → nothing to match

    // Reuse the matching behind the `normas_que_me_aplican` MCP tool.
    const applicable = await normsForProfile({
      tipoEmpresa: company.company_type, sectores: company.sectors, severidadMin: 'low', limit: 50,
    })
    if (!applicable.length) continue

    // Resolve external_id → internal uuid (alerts.norm_id is a FK to norms.id).
    const { data: idRows } = await db.from('norms')
      .select('id, external_id').in('external_id', applicable.map((n) => n.external_id))
    const idByExt = new Map((idRows ?? []).map((r) => [r.external_id, r.id]))

    for (const norm of applicable) {
      if (work.length >= MAX_NEW_ALERTS_PER_RUN) { capped = true; break }
      const normId = idByExt.get(norm.external_id)
      if (!normId || seen.has(`${company.id}:${normId}`)) continue
      seen.add(`${company.id}:${normId}`) // guard against the same norm twice within this run
      work.push({ company, norm, normId })
    }
  }

  // One alert: brief (1 LLM call) → insert → dispatch to the company's channels.
  const processOne = async ({ company, norm, normId }: WorkItem): Promise<string[]> => {
    const brief = await generateBrief(norm, company).catch((e) => {
      console.error(`brief failed for ${company.id}:${normId}:`, e)
      return null
    })
    const { impact, recommendation } = brief
      ? briefToAlertFields(brief)
      : { impact: norm.summary ?? norm.title, recommendation: 'Revisa la norma con tu contador.' }

    const { data: alert } = await db.from('alerts')
      .insert({ company_id: company.id, norm_id: normId, impact, recommendation, brief })
      .select('id').single()

    const { delivered } = await deliverAlert(company.channels ?? [], {
      norm_title: norm.title, norm_url: norm.url, impact, recommendation,
      severity: (norm.severity ?? 'low') as 'low' | 'medium' | 'high',
      brief,
      guide_url: alert ? guideUrl(alert.id) : null,
    })
    return delivered
  }

  // Phase 2 — process the work list in concurrent batches.
  let alertsCreated = 0
  const channelStats: Record<string, number> = {}
  for (let i = 0; i < work.length; i += CONCURRENCY) {
    const batch = work.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(batch.map(processOne))
    for (const r of results) {
      if (r.status !== 'fulfilled') { console.error('alert failed:', r.reason); continue }
      alertsCreated++
      r.value.forEach((t) => { channelStats[t] = (channelStats[t] ?? 0) + 1 })
    }
  }

  // capped=true → norms still pending; run again (or wait for the cron) to drain them.
  return NextResponse.json({ companies: companies?.length ?? 0, alertsCreated, capped, channels: channelStats })
}

export { handle as GET, handle as POST }
