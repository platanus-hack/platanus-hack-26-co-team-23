import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { withApiGuard } from '@/lib/api-guard'
import { NORM_FIELDS } from '@/lib/norms-queries'

// Read-only API with an API key: the surface the complai-mcp npm package consumes.
// Only already-analyzed norms; access control is by key generated at /keys.
export const GET = withApiGuard(async (req) => {
  const { searchParams } = new URL(req.url)
  const sector = searchParams.get('sector')
  const q = searchParams.get('q')
  const limit = Math.min(Number(searchParams.get('limit') ?? 10), 20)

  let query = supabaseAdmin().from('norms').select(NORM_FIELDS)
    .not('analyzed_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit)
  if (sector) query = query.contains('sectors', [sector])
  if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'query failed' }, { status: 500 })
  return NextResponse.json(data)
})
