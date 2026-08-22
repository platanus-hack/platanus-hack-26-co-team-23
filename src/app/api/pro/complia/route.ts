import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateCompliaMd } from '@/lib/pro/complia-md'
import { listRepoPaths } from '@/lib/pro/github'
import { octokitFor } from '@/lib/pro/octokit'

export const maxDuration = 120

// lazy: companyId llega del cliente. Cuando exista auth (Task 3), sacarlo de la sesión.
// Lo que NO puede volver a pasar: aceptar repo/installationId sueltos del body — eso
// dejaba leer el código de cualquier instalación cuyo id se adivinara.

/**
 * POST { companyId, repo? } → { markdown } — el COMPLIA.md propuesto.
 * El repo y la credencial salen de la empresa, no del request. `repo` es opcional y
 * solo se acepta si la instalación de esa empresa realmente lo alcanza.
 */
export async function POST(req: NextRequest) {
  const { companyId, repo: pedido } = await req.json()
  if (!companyId) return NextResponse.json({ error: 'falta companyId' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: company } = await db
    .from('companies')
    .select('github_repo, github_installation_id')
    .eq('id', companyId)
    .single()
  if (!company) return NextResponse.json({ error: 'empresa no encontrada' }, { status: 404 })

  try {
    const gh = await octokitFor(company.github_installation_id)

    let full = company.github_repo
    if (pedido && pedido !== company.github_repo) {
      const { data } = await gh.rest.apps.listReposAccessibleToInstallation()
      if (!data.repositories.some((r) => r.full_name === pedido))
        return NextResponse.json({ error: `la empresa no tiene acceso a ${pedido}` }, { status: 403 })
      full = pedido
    }
    if (!full) return NextResponse.json({ error: 'la empresa no tiene repo configurado' }, { status: 400 })

    const [owner, repo] = full.split('/')
    const paths = (await listRepoPaths(gh, owner, repo))
      .filter((p) => /\.(ts|tsx|js|json|md)$/.test(p))
      .slice(0, 25)
    const files = await Promise.all(
      paths.map(async (path) => {
        const { data } = await gh.rest.repos.getContent({ owner, repo, path })
        return { path, content: 'content' in data ? Buffer.from(data.content, 'base64').toString() : '' }
      }),
    )
    return NextResponse.json({ repo: full, markdown: await generateCompliaMd(full, files) })
  } catch (e) {
    console.error('generateCompliaMd falló:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
