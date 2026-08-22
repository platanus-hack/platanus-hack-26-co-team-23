import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { octokitFor } from '@/lib/pro/octokit'
import { buildInstallUrl } from '@/lib/pro/install-state'

// lazy: both handlers receive companyId from the client. Once auth exists (Task 3),
// pull it from the session instead of the request — today the dashboard is the only door.

/**
 * GET ?companyId=… → repos the company exposed when installing the GitHub App.
 * If it hasn't installed it yet, returns the URL to send it to.
 */
export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('companyId')
  if (!companyId) return NextResponse.json({ error: 'missing companyId' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: company } = await db
    .from('companies')
    .select('github_repo, github_installation_id')
    .eq('id', companyId)
    .single()
  if (!company) return NextResponse.json({ error: 'company not found' }, { status: 404 })

  try {
    // Inside the try: buildInstallUrl throws if GITHUB_STATE_SECRET is missing, and a
    // bodyless 500 doesn't say which env var needs configuring in that Vercel environment.
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
    console.error('GET /api/pro/repos failed:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}

/** POST { companyId, repo } → sets the repo PRs will be opened against. */
export async function POST(req: NextRequest) {
  const { companyId, repo } = await req.json()
  if (!companyId || !repo) return NextResponse.json({ error: 'missing companyId or repo' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: company } = await db
    .from('companies')
    .select('github_installation_id')
    .eq('id', companyId)
    .single()
  if (!company?.github_installation_id)
    return NextResponse.json({ error: 'company does not have the GitHub App installed' }, { status: 400 })

  // Only repos the installation actually reaches: otherwise we'd save a repo
  // we couldn't later open a PR against.
  const gh = await octokitFor(company.github_installation_id)
  const { data } = await gh.rest.apps.listReposAccessibleToInstallation()
  if (!data.repositories.some((r) => r.full_name === repo))
    return NextResponse.json({ error: `the installation does not have access to ${repo}` }, { status: 400 })

  const { error } = await db.from('companies').update({ github_repo: repo }).eq('id', companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, selected: repo })
}
