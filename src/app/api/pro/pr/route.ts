import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { openCompliancePR } from '@/lib/pro/github'
import { callerOwnsAlert } from '@/lib/api-auth'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const { alertId } = await req.json()
  // Opening a PR writes to the customer's repo and costs an LLM call: session only.
  if (!(await callerOwnsAlert(alertId)))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = supabaseAdmin()
  const { data: alert } = await db
    .from('alerts')
    .select('*, norms(*), companies(*)')
    .eq('id', alertId)
    .single()
  if (!alert) return NextResponse.json({ error: 'alert not found' }, { status: 404 })
  if (!alert.companies.github_repo)
    return NextResponse.json({ error: 'company has no repo configured' }, { status: 400 })

  try {
    const res = await openCompliancePR({
      repo: alert.companies.github_repo,
      installationId: alert.companies.github_installation_id,
      reviewer: alert.companies.reviewer_github,
      normTitle: alert.norms.title,
      obligations: alert.norms.obligations,
      impact: alert.impact,
    })
    // The norm doesn't touch this code: not an error, there's simply no PR to open.
    if ('skipped' in res) return NextResponse.json(res)

    await db.from('alerts').update({ pr_url: res.prUrl }).eq('id', alertId)
    return NextResponse.json({ prUrl: res.prUrl })
  } catch (e) {
    console.error('openCompliancePR failed:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
