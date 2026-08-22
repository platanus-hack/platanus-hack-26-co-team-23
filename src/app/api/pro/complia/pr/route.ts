import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { openPrWithChanges } from '@/lib/pro/github'
import { octokitFor } from '@/lib/pro/octokit'

export const maxDuration = 120

// lazy: companyId llega del cliente, igual que el resto de /api/pro. Con auth, de la sesión.

/**
 * POST { companyId, markdown } → { prUrl }
 * Abre un PR en draft que agrega (o actualiza) el COMPLIA.md en la raíz del repo
 * conectado. El markdown es el que el usuario revisó en el dashboard.
 */
export async function POST(req: NextRequest) {
  const { companyId, markdown } = await req.json()
  if (!companyId || !markdown?.trim())
    return NextResponse.json({ error: 'falta companyId o markdown' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: company } = await db
    .from('companies')
    .select('github_repo, github_installation_id, reviewer_github')
    .eq('id', companyId)
    .single()
  if (!company) return NextResponse.json({ error: 'empresa no encontrada' }, { status: 404 })
  if (!company.github_repo)
    return NextResponse.json({ error: 'la empresa no tiene repo configurado' }, { status: 400 })

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
    console.error('PR de COMPLIA.md falló:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
