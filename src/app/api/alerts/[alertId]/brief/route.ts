import { NextResponse } from 'next/server'
import { getOrCreateBrief } from '@/lib/alerts/get-brief'
import { callerOwnsAlert } from '@/lib/api-auth'

export const maxDuration = 60

/** GET → the notice as JSON: what changed, why it affects you, what happens if you do
 *  nothing, and the steps. This is what the dispatcher uses to build each channel's message. */
export async function GET(_req: Request, { params }: { params: Promise<{ alertId: string }> }) {
  const { alertId } = await params
  // Dashboard-only: the alert's content belongs to one company.
  if (!(await callerOwnsAlert(alertId)))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const data = await getOrCreateBrief(alertId)
    if (!data) return NextResponse.json({ error: 'alert not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (e) {
    console.error('alert brief failed:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
