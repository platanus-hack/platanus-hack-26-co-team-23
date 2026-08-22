import { NextResponse } from 'next/server'
import { withApiGuard } from '@/lib/api-guard'
import { recentChanges } from '@/lib/norms-queries'

export const GET = withApiGuard(async (req) => {
  const p = new URL(req.url).searchParams
  const data = await recentChanges({
    desde: p.get('desde') ?? undefined,
    sector: p.get('sector') ?? undefined,
    severidadMin: p.get('severidad_min') ?? undefined,
    limit: Number(p.get('limit')) || undefined,
  })
  return NextResponse.json(data)
})
