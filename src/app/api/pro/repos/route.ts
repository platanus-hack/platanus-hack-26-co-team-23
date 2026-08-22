import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { octokitFor } from '@/lib/pro/octokit'
import { buildInstallUrl } from '@/lib/pro/install-state'
import { callerCompany } from '@/lib/api-auth'

// The company comes from the Clerk session, never from the request.

/**
 * GET ?companyId=… → repos the company exposed when installing the GitHub App.
 * If it hasn't installed it yet, returns the URL to send it to.
 */
export async function GET(req: NextRequest) {
  const caller = await callerCompany()
  if (!caller) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const companyId = caller.id

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
  const caller = await callerCompany()
  if (!caller) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const companyId = caller.id
  const { repo } = await req.json()
  if (!repo) return NextResponse.json({ error: 'missing repo' }, { status: 400 })

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
