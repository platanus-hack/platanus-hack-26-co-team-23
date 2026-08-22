import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyState } from '@/lib/pro/install-state'

/**
 * Vuelta de la instalación de la GitHub App.
 * GitHub redirige acá con ?installation_id=N&setup_action=install&state=<firmado>.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const installationId = Number(url.searchParams.get('installation_id'))
  const home = new URL('/settings', url.origin)

  if (!installationId) {
    home.searchParams.set('github', 'error')
    return NextResponse.redirect(home)
  }

  // Firmado por nosotros al mandar al usuario a instalar: si no valida, el state
  // no salió de nuestro botón y no sabemos a qué empresa pertenece la instalación.
  const companyId = verifyState(url.searchParams.get('state'))
  if (!companyId) {
    // Instalación iniciada desde GitHub (sin pasar por el botón) o state manipulado:
    // devolvemos el id para que el usuario lo asocie desde el dashboard.
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
