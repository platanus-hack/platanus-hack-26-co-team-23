import { NextResponse } from 'next/server'
import { getOrCreateBrief } from '@/lib/alerts/get-brief'
import { buildGuidePdf } from '@/lib/alerts/guide-pdf'
import { callerOwnsAlert, verifyLink } from '@/lib/api-auth'

export const maxDuration = 60

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 60).toLowerCase()

/** GET → the guide as a PDF, ready to download or attach. */
export async function GET(req: Request, { params }: { params: Promise<{ alertId: string }> }) {
  const { alertId } = await params
  // Two ways in: the signed link we send by WhatsApp/email (no login possible there),
  // or a dashboard session belonging to that company.
  const sig = new URL(req.url).searchParams.get('sig')
  if (!verifyLink('guia', alertId, sig) && !(await callerOwnsAlert(alertId)))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const data = await getOrCreateBrief(alertId)
    if (!data) return NextResponse.json({ error: 'alert not found' }, { status: 404 })

    const pdf = await buildGuidePdf(data.brief, data)
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="guia-${slug(data.normTitle)}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (e) {
    console.error('PDF guide failed:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
