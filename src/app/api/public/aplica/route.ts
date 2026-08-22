import { NextResponse } from 'next/server'
import { withApiGuard } from '@/lib/api-guard'
import { normsForProfile } from '@/lib/norms-queries'

export const GET = withApiGuard(async (req) => {
  const p = new URL(req.url).searchParams
  const tipoEmpresa = p.get('tipo_empresa')
  const sectores = (p.get('sectores') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!tipoEmpresa || !sectores.length)
    return NextResponse.json({ error: 'tipo_empresa y sectores son requeridos' }, { status: 400 })

  const data = await normsForProfile({
    tipoEmpresa, sectores,
    severidadMin: p.get('severidad_min') ?? undefined,
    limit: Number(p.get('limit')) || undefined,
  })
  return NextResponse.json(data)
})
