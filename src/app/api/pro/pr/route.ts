import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { openCompliancePR } from '@/lib/pro/github'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const { alertId } = await req.json()
  const db = supabaseAdmin()
  const { data: alert } = await db
    .from('alerts')
    .select('*, norms(*), companies(*)')
    .eq('id', alertId)
    .single()
  if (!alert) return NextResponse.json({ error: 'alert no encontrada' }, { status: 404 })
  if (!alert.companies.github_repo)
    return NextResponse.json({ error: 'empresa sin repo configurado' }, { status: 400 })

  try {
    const prUrl = await openCompliancePR({
      repo: alert.companies.github_repo,
      installationId: alert.companies.github_installation_id,
      reviewer: alert.companies.reviewer_github,
      normTitle: alert.norms.title,
      obligations: alert.norms.obligations,
      impact: alert.impact,
    })
    await db.from('alerts').update({ pr_url: prUrl }).eq('id', alertId)
    return NextResponse.json({ prUrl })
  } catch (e) {
    console.error('openCompliancePR falló:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
