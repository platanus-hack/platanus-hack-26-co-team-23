import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateCompliaMd } from '@/lib/pro/complia-md'
import { listRepoPaths } from '@/lib/pro/github'
import { octokitFor } from '@/lib/pro/octokit'
import { callerCompany } from '@/lib/api-auth'

export const maxDuration = 120


/**
 * POST { repo? } → { markdown } — the proposed COMPLIA.md.
 * The repo and credential come from the company, not the request. `repo` is optional and
 * only accepted if that company's installation actually reaches it.
 */
export async function POST(req: NextRequest) {
  const caller = await callerCompany()
  if (!caller) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const companyId = caller.id
  const { repo: requested } = await req.json().catch(() => ({}))

  const db = supabaseAdmin()
  const { data: company } = await db
    .from('companies')
    .select('github_repo, github_installation_id')
    .eq('id', companyId)
    .single()
  if (!company) return NextResponse.json({ error: 'company not found' }, { status: 404 })

  try {
    const gh = await octokitFor(company.github_installation_id)

    let full = company.github_repo
    if (requested && requested !== company.github_repo) {
      const { data } = await gh.rest.apps.listReposAccessibleToInstallation()
      if (!data.repositories.some((r) => r.full_name === requested))
        return NextResponse.json({ error: `company does not have access to ${requested}` }, { status: 403 })
      full = requested
    }
    if (!full) return NextResponse.json({ error: 'company has no repo configured' }, { status: 400 })

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
    console.error('generateCompliaMd failed:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
