import { NextResponse } from 'next/server'
import { withApiGuard } from '@/lib/api-guard'
import { obligationsWithDeadline } from '@/lib/norms-queries'

export const GET = withApiGuard(async (req) => {
  const p = new URL(req.url).searchParams
  const data = await obligationsWithDeadline({
    sector: p.get('sector') ?? undefined,
    antesDe: p.get('antes_de') ?? undefined,
    limit: Number(p.get('limit')) || undefined,
  })
  return NextResponse.json(data)
})
