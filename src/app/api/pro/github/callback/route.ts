import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyState } from '@/lib/pro/install-state'

/**
 * Return from the GitHub App installation.
 * GitHub redirects here with ?installation_id=N&setup_action=install&state=<signed>.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const installationId = Number(url.searchParams.get('installation_id'))
  const home = new URL('/settings', url.origin)

  if (!installationId) {
    home.searchParams.set('github', 'error')
    return NextResponse.redirect(home)
  }

  // Signed by us when we send the user to install: if it doesn't validate, the state
  // didn't come from our button and we don't know which company the installation belongs to.
  const companyId = verifyState(url.searchParams.get('state'))
  if (!companyId) {
    // Installation started from GitHub (without going through the button) or a tampered
    // state: we return the id so the user can associate it from the dashboard.
    home.searchParams.set('installation_id', String(installationId))
    return NextResponse.redirect(home)
  }

  const db = supabaseAdmin()
  const { error } = await db
    .from('companies')
    .update({ github_installation_id: installationId })
    .eq('id', companyId)

  home.searchParams.set('github', error ? 'error' : 'ok')
  return NextResponse.redirect(home)
}
