import { NextResponse } from 'next/server'
import { getOrCreateBrief } from '@/lib/alerts/get-brief'
import { buildGuidePdf } from '@/lib/alerts/guide-pdf'

export const maxDuration = 60

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 60).toLowerCase()

/** GET → la guía en PDF, lista para descargar o adjuntar. */
export async function GET(_req: Request, { params }: { params: Promise<{ alertId: string }> }) {
  const { alertId } = await params
  try {
    const data = await getOrCreateBrief(alertId)
    if (!data) return NextResponse.json({ error: 'alerta no encontrada' }, { status: 404 })

    const pdf = await buildGuidePdf(data.brief, data)
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="guia-${slug(data.normTitle)}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (e) {
    console.error('guía en PDF falló:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
