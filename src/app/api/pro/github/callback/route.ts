import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Vuelta de la instalación de la GitHub App.
 * GitHub redirige acá con ?installation_id=N&setup_action=install&state=<companyId>,
 * donde el state lo pusimos nosotros al mandar al usuario a instalar.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const installationId = Number(url.searchParams.get('installation_id'))
  const companyId = url.searchParams.get('state')
  const home = new URL('/settings', url.origin)

  if (!installationId) {
    home.searchParams.set('github', 'error')
    return NextResponse.redirect(home)
  }

  // Sin state (instalación iniciada desde GitHub, no desde nuestro botón):
  // devolvemos el id para que el usuario lo asocie desde el dashboard.
  if (!companyId) {
    home.searchParams.set('installation_id', String(installationId))
    return NextResponse.redirect(home)
  }

  // lazy: el state llega del cliente y aún no hay sesión que verificar (Task 3, M2).
  // Cuando exista auth, confirmar que el usuario logueado es dueño de companyId
  // antes del update — si no, cualquiera podría asociar su instalación a otra empresa.
  const db = supabaseAdmin()
  const { error } = await db
    .from('companies')
    .update({ github_installation_id: installationId })
    .eq('id', companyId)

  home.searchParams.set('github', error ? 'error' : 'ok')
  return NextResponse.redirect(home)
}
