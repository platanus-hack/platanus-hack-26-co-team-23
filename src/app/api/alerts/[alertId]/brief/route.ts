import { NextResponse } from 'next/server'
import { getOrCreateBrief } from '@/lib/alerts/get-brief'

export const maxDuration = 60

/** GET → el aviso en JSON: qué cambió, por qué te afecta, qué pasa si no haces nada, pasos.
 *  Es lo que el dispatcher usa para armar el mensaje de cada canal. */
export async function GET(_req: Request, { params }: { params: Promise<{ alertId: string }> }) {
  const { alertId } = await params
  try {
    const data = await getOrCreateBrief(alertId)
    if (!data) return NextResponse.json({ error: 'alerta no encontrada' }, { status: 404 })
    return NextResponse.json(data)
  } catch (e) {
    console.error('brief de alerta falló:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
