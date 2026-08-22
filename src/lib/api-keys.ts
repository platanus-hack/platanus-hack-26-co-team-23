import { createHash, randomBytes } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const hashApiKey = (raw: string) => createHash('sha256').update(raw).digest('hex')

export function generateApiKey() {
  const raw = `cai_${randomBytes(24).toString('hex')}`
  return { raw, prefix: raw.slice(0, 10), hash: hashApiKey(raw) }
}

function extractKey(req: Request): string | null {
  const header = req.headers.get('x-api-key') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return header?.startsWith('cai_') ? header : null
}

// true si la request trae una key válida (o la MASTER_API_KEY de bootstrap/demo).
export async function validateApiKey(req: Request): Promise<boolean> {
  const key = extractKey(req)
  if (!key) return false
  if (process.env.MASTER_API_KEY && key === process.env.MASTER_API_KEY) return true

  const db = supabaseAdmin()
  const { data } = await db.from('api_keys')
    .select('id').eq('key_hash', hashApiKey(key)).is('revoked_at', null).maybeSingle()
  if (!data) return false
  // telemetría best-effort — no bloquea la request
  void db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {})
  return true
}

export const unauthorized = () =>
  new Response(
    JSON.stringify({ error: 'API key requerida. Genera la tuya en https://complai-co.vercel.app/keys (header x-api-key o Authorization: Bearer cai_...)' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  )
