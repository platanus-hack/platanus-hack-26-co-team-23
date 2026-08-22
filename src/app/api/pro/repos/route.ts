import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { octokitFor } from '@/lib/pro/octokit'
import { buildInstallUrl } from '@/lib/pro/install-state'

// lazy: ambos handlers reciben companyId del cliente. Cuando exista auth (Task 3),
// sacarlo de la sesión y no del request — hoy el dashboard es la única puerta.

/**
 * GET ?companyId=… → repos que la empresa expuso al instalar la GitHub App.
 * Si todavía no la instaló, devuelve la URL a la que mandarla.
 */
export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('companyId')
  if (!companyId) return NextResponse.json({ error: 'falta companyId' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: company } = await db
    .from('companies')
    .select('github_repo, github_installation_id')
    .eq('id', companyId)
    .single()
  if (!company) return NextResponse.json({ error: 'empresa no encontrada' }, { status: 404 })

  try {
    // Dentro del try: buildInstallUrl lanza si falta GITHUB_STATE_SECRET, y un 500
    // sin cuerpo no dice qué env falta configurar en ese entorno de Vercel.
    if (!company.github_installation_id)
      return NextResponse.json({ connected: false, installUrl: buildInstallUrl(companyId) })

    const gh = await octokitFor(company.github_installation_id)
    const { data } = await gh.rest.apps.listReposAccessibleToInstallation()
    return NextResponse.json({
      connected: true,
      selected: company.github_repo,
      repos: data.repositories.map((r) => ({ fullName: r.full_name, private: r.private })),
      manageUrl: buildInstallUrl(companyId),
    })
  } catch (e) {
    console.error('GET /api/pro/repos falló:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}

/** POST { companyId, repo } → fija el repo sobre el que se abrirán los PRs. */
export async function POST(req: NextRequest) {
  const { companyId, repo } = await req.json()
  if (!companyId || !repo) return NextResponse.json({ error: 'falta companyId o repo' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: company } = await db
    .from('companies')
    .select('github_installation_id')
    .eq('id', companyId)
    .single()
  if (!company?.github_installation_id)
    return NextResponse.json({ error: 'la empresa no tiene la GitHub App instalada' }, { status: 400 })

  // Solo repos que la instalación realmente alcanza: si no, guardaríamos un repo
  // sobre el que después no podemos abrir el PR.
  const gh = await octokitFor(company.github_installation_id)
  const { data } = await gh.rest.apps.listReposAccessibleToInstallation()
  if (!data.repositories.some((r) => r.full_name === repo))
    return NextResponse.json({ error: `la instalación no tiene acceso a ${repo}` }, { status: 400 })

  const { error } = await db.from('companies').update({ github_repo: repo }).eq('id', companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, selected: repo })
}
