import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getOrCreateBrief } from '@/lib/alerts/get-brief'
import { buildSpeech, twimlFor, verifyTwimlSig } from '@/lib/deliver/voice-script'

export const maxDuration = 30

/**
 * GET /api/alerts/[alertId]/twiml?sig=… — the spoken script Twilio fetches when it
 * places the call. Public by necessity (Twilio calls it unauthenticated), so the
 * signature is what protects it.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ alertId: string }> }) {
  const { alertId } = await params
  if (!verifyTwimlSig(alertId, req.nextUrl.searchParams.get('sig')))
    return NextResponse.json({ error: 'invalid signature' }, { status: 403 })

  const db = supabaseAdmin()
  const { data: alert } = await db
    .from('alerts')
    .select('impact, recommendation, norm:norms(title)')
    .eq('id', alertId)
    .single()
  if (!alert?.norm) return NextResponse.json({ error: 'alert not found' }, { status: 404 })

  const norm = alert.norm as unknown as { title: string }
  // Reuses the stored brief so the call says the same as the email and the PDF.
  const brief = await getOrCreateBrief(alertId).catch(() => null)

  const speech = buildSpeech({
    norm_title: norm.title,
    impact: alert.impact,
    recommendation: alert.recommendation,
    brief: brief?.brief ?? null,
  })
  console.log(`[twiml ${alertId.slice(0, 8)}] sirviendo guion de ${speech.length} caracteres`)

  return new NextResponse(twimlFor(speech), {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
