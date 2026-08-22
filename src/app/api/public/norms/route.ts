import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { withApiGuard } from '@/lib/api-guard'
import { NORM_FIELDS } from '@/lib/norms-queries'

// API read-only con API key: superficie que consume el paquete npm complai-mcp.
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
