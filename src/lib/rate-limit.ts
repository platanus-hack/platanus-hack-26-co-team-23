import { supabaseAdmin } from '@/lib/supabase/admin'
import { hashApiKey } from '@/lib/api-keys'

// Bucket by API key (hashed, we never expose the key in the table) if present; otherwise by IP.
// This way the same limit covers authenticated abuse and pre-auth key brute-forcing.
function bucketFor(req: Request): string {
  const key = req.headers.get('x-api-key') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (key?.startsWith('cai_')) return `key:${hashApiKey(key)}`
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  return `ip:${ip}`
}

// Fixed window via an atomic Postgres function. Fail-open: if the limiter fails,
// we don't take the service down (the rate limiter must never turn into its own DoS).
export async function rateLimit(
  req: Request,
  { limit = 60, windowSec = 60 }: { limit?: number; windowSec?: number } = {},
): Promise<{ ok: boolean; remaining: number; retryAfter: number }> {
  const bucket = bucketFor(req)
  const { data, error } = await supabaseAdmin().rpc('check_rate_limit', {
    p_bucket: bucket, p_limit: limit, p_window: windowSec,
  })
  if (error) {
    console.error('rate limit rpc failed (fail-open):', error.message)
    return { ok: true, remaining: limit, retryAfter: 0 }
  }
  const count = Number(data)
  return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfter: windowSec }
}

export const tooManyRequests = (retryAfter: number) =>
  new Response(
    JSON.stringify({ error: 'Rate limit exceeded. Try again in a few seconds.' }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) } },
  )
