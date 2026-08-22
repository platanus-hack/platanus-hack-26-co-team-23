import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { openPrWithChanges } from '@/lib/pro/github'
import { octokitFor } from '@/lib/pro/octokit'
import { callerCompany } from '@/lib/api-auth'

export const maxDuration = 120


/**
 * POST { companyId, markdown } → { prUrl }
 * Opens a draft PR that adds (or updates) COMPLIA.md at the root of the connected
 * repo. The markdown is what the user reviewed in the dashboard.
 */
export async function POST(req: NextRequest) {
  const caller = await callerCompany()
  if (!caller) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const companyId = caller.id
  const { markdown } = await req.json()
  if (!markdown?.trim()) return NextResponse.json({ error: 'missing markdown' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: company } = await db
    .from('companies')
    .select('github_repo, github_installation_id, reviewer_github')
    .eq('id', companyId)
    .single()
  if (!company) return NextResponse.json({ error: 'company not found' }, { status: 404 })
  if (!company.github_repo)
    return NextResponse.json({ error: 'company has no repo configured' }, { status: 400 })

  try {
    const [owner, repo] = company.github_repo.split('/')
    const gh = await octokitFor(company.github_installation_id)
    const prUrl = await openPrWithChanges(gh, {
      owner,
      repo,
      changes: [{ path: 'COMPLIA.md', content: markdown.endsWith('\n') ? markdown : markdown + '\n' }],
      branchPrefix: 'complia/manifiesto',
      commitMessage: 'docs: agregar COMPLIA.md con el contexto para el agente de cumplimiento',
      title: '[complAI] Agregar COMPLIA.md',
      body: `Este archivo le dice al agente de cumplimiento qué archivos de este repositorio importan cuando cambia la normativa, cuáles están fuera de alcance y qué debe mirar el revisor.\n\nRevísalo y ajústalo: entre más preciso, mejores son los PRs de cumplimiento que abre complAI.`,
      reviewer: company.reviewer_github,
    })
    return NextResponse.json({ prUrl })
  } catch (e) {
    console.error('COMPLIA.md PR failed:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
