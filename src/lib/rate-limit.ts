import { supabaseAdmin } from '@/lib/supabase/admin'
import { hashApiKey } from '@/lib/api-keys'

// Bucket por API key (hasheada, no exponemos la key en la tabla) si viene; si no, por IP.
// Así el mismo límite cubre abuso autenticado y brute-force de keys pre-auth.
function bucketFor(req: Request): string {
  const key = req.headers.get('x-api-key') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (key?.startsWith('cai_')) return `key:${hashApiKey(key)}`
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  return `ip:${ip}`
}

// Fixed window vía función atómica en Postgres. Fail-open: si el limiter falla,
// no tumbamos el servicio (el rate limiter nunca debe volverse un DoS de sí mismo).
export async function rateLimit(
  req: Request,
  { limit = 60, windowSec = 60 }: { limit?: number; windowSec?: number } = {},
): Promise<{ ok: boolean; remaining: number; retryAfter: number }> {
  const bucket = bucketFor(req)
  const { data, error } = await supabaseAdmin().rpc('check_rate_limit', {
    p_bucket: bucket, p_limit: limit, p_window: windowSec,
  })
  if (error) {
    console.error('rate limit rpc falló (fail-open):', error.message)
    return { ok: true, remaining: limit, retryAfter: 0 }
  }
  const count = Number(data)
  return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfter: windowSec }
}

export const tooManyRequests = (retryAfter: number) =>
  new Response(
    JSON.stringify({ error: 'Rate limit excedido. Reintenta en unos segundos.' }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) } },
  )
