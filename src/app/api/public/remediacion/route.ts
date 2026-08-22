import { NextResponse } from 'next/server'
import { withApiGuard } from '@/lib/api-guard'
import { remediationPlan } from '@/lib/norms-queries'

export const maxDuration = 60

export const POST = withApiGuard(async (req) => {
  const body = await req.json().catch(() => ({}))
  if (!body.norma) return NextResponse.json({ error: 'norma is required' }, { status: 400 })
  const data = await remediationPlan({ norma: String(body.norma), stack: body.stack ? String(body.stack) : undefined })
  return NextResponse.json(data)
})
