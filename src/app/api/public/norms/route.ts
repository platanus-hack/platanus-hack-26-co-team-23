import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// API pública read-only: la superficie que consume el paquete npm complai-mcp.
// Solo normas ya analizadas; las normas son datos públicos.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sector = searchParams.get('sector')
  const q = searchParams.get('q')
  const limit = Math.min(Number(searchParams.get('limit') ?? 10), 20)

  const db = supabaseAdmin()
  let query = db.from('norms')
    .select('title, issuer, norm_type, published_at, summary, sectors, obligations, severity, url')
    .not('analyzed_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit)
  if (sector) query = query.contains('sectors', [sector])
  if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'query failed' }, { status: 500 })
  return NextResponse.json(data)
}
