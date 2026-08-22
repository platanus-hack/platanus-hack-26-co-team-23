import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { deliverAlert, ADAPTERS } from '@/lib/deliver/dispatch'
import { getOrCreateBrief } from '@/lib/alerts/get-brief'
import { guideUrl } from '@/lib/app-url'
import type { ChannelAdapter, ChannelConfig } from '@/lib/deliver/types'

export const maxDuration = 120

type Attempt = { channel: string; ok: boolean; ms: number; error?: string }

/**
 * Wraps the real adapters to time each call and log it. `deliverAlert` takes the
 * registry as a parameter, so instrumenting costs nothing in the delivery path.
 */
function instrument(tag: string, attempts: Attempt[]): Record<string, ChannelAdapter> {
  return Object.fromEntries(
    Object.entries(ADAPTERS).map(([type, adapter]) => [
      type,
      {
        async send(config, payload) {
          const t0 = Date.now()
          console.log(`${tag} → ${type}: enviando`)
          try {
            await adapter.send(config, payload)
            const ms = Date.now() - t0
            attempts.push({ channel: type, ok: true, ms })
            console.log(`${tag} ✓ ${type}: entregado en ${ms}ms`)
          } catch (e) {
            const ms = Date.now() - t0
            const error = String((e as Error)?.message ?? e).slice(0, 400)
            attempts.push({ channel: type, ok: false, ms, error })
            console.error(`${tag} ✗ ${type}: falló en ${ms}ms — ${error}`)
            throw e
          }
        },
      } satisfies ChannelAdapter,
    ]),
  )
}

/**
 * POST /api/alerts/[alertId]/resend — reenvía una alerta ya existente a todos los
 * canales de su empresa. Pensado para probar la entrega sin tener que borrar alertas
 * ni esperar al cron.
 *
 * Body opcional:
 *   { channels: ["slack"], ignoreMinSeverity: true }
 *
 * Protegido con CRON_SECRET porque dispara envíos reales (correos, WhatsApp, llamadas).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ alertId: string }> }) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { alertId } = await params
  const tag = `[resend ${alertId.slice(0, 8)}]`
  const t0 = Date.now()
  const body = await req.json().catch(() => ({}))
  const only: string[] | undefined = Array.isArray(body.channels) ? body.channels : undefined
  const ignoreMinSeverity = body.ignoreMinSeverity === true

  const db = supabaseAdmin()
  const { data: alert } = await db
    .from('alerts')
    .select('id, impact, recommendation, norm:norms(*), company:companies(name, channels)')
    .eq('id', alertId)
    .single()
  if (!alert?.norm || !alert?.company)
    return NextResponse.json({ error: 'alert not found' }, { status: 404 })

  const norm = alert.norm as unknown as {
    title: string; url: string | null; issuer: string | null; source: string | null
    severity: 'low' | 'medium' | 'high' | null
  }
  const company = alert.company as unknown as { name: string; channels: ChannelConfig[] }

  let channels = company.channels ?? []
  if (only) channels = channels.filter((c) => only.includes(c.type))
  // For testing: deliver regardless of each channel's severity threshold.
  if (ignoreMinSeverity) channels = channels.map(({ min_severity: _drop, ...c }) => c)

  console.log(
    `${tag} empresa "${company.name}" · norma "${norm.title.slice(0, 60)}" · severidad ${norm.severity} · ` +
      `canales: ${channels.map((c) => c.type).join(', ') || 'ninguno'}${ignoreMinSeverity ? ' (ignorando min_severity)' : ''}`,
  )
  if (!channels.length)
    return NextResponse.json(
      { error: 'la empresa no tiene canales configurados (o ninguno coincide con el filtro)' },
      { status: 400 },
    )

  // Reuses the stored brief; only generates one if the alert predates it.
  const brief = await getOrCreateBrief(alertId).catch((e) => {
    console.error(`${tag} brief failed:`, e)
    return null
  })

  const attempts: Attempt[] = []
  const { delivered, failed } = await deliverAlert(
    channels,
    {
      alert_id: alertId,
      norm_title: norm.title,
      norm_url: norm.url,
      norm_issuer: norm.issuer,
      norm_source: norm.source,
      impact: alert.impact,
      recommendation: alert.recommendation,
      severity: (norm.severity ?? 'low') as 'low' | 'medium' | 'high',
      brief: brief?.brief ?? null,
      guide_url: guideUrl(alertId),
    },
    instrument(tag, attempts),
  )

  // Channels skipped by their own min_severity never reach an adapter, so they have no attempt.
  const skipped = channels
    .map((c) => c.type)
    .filter((t) => !attempts.some((a) => a.channel === t))

  const durationMs = Date.now() - t0
  console.log(
    `${tag} fin en ${durationMs}ms · entregados: ${delivered.join(', ') || '—'} · ` +
      `fallidos: ${failed.join(', ') || '—'} · omitidos por severidad: ${skipped.join(', ') || '—'}`,
  )

  return NextResponse.json({
    alertId,
    company: company.name,
    norm: norm.title,
    severity: norm.severity,
    brief: brief ? 'sí' : 'no',
    delivered,
    failed,
    skippedByMinSeverity: skipped,
    attempts: attempts.sort((a, b) => a.channel.localeCompare(b.channel)),
    durationMs,
  })
}
