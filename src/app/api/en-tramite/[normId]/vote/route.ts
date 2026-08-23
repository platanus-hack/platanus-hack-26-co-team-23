import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { VoteChoice, VoteTally } from '@/lib/types'

// One vote per user per proposed norm, changeable and toggleable (click the same choice = un-vote).
// Votes are private to the user's Clerk org — the tally only counts this org's members.
export async function POST(req: Request, { params }: { params: Promise<{ normId: string }> }) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { normId } = await params
  const body = (await req.json().catch(() => ({}))) as { vote?: string }
  if (body.vote !== 'favor' && body.vote !== 'contra')
    return NextResponse.json({ error: 'vote debe ser favor | contra' }, { status: 400 })
  const vote = body.vote as VoteChoice

  const db = supabaseAdmin()
  const { data: existing } = await db
    .from('norm_votes')
    .select('id, vote')
    .eq('norm_id', normId)
    .eq('clerk_user_id', userId)
    .maybeSingle()

  if (existing && existing.vote === vote) {
    await db.from('norm_votes').delete().eq('id', existing.id) // same choice → remove it
  } else if (existing) {
    await db.from('norm_votes').update({ vote }).eq('id', existing.id) // switch side
  } else {
    const { error } = await db
      .from('norm_votes')
      .insert({ norm_id: normId, clerk_org_id: orgId, clerk_user_id: userId, vote })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(await tally(db, normId, orgId, userId))
}

async function tally(
  db: ReturnType<typeof supabaseAdmin>,
  normId: string,
  orgId: string,
  userId: string,
): Promise<VoteTally> {
  const { data } = await db
    .from('norm_votes')
    .select('vote, clerk_user_id')
    .eq('norm_id', normId)
    .eq('clerk_org_id', orgId)
  const rows = data ?? []
  return {
    favor: rows.filter((r) => r.vote === 'favor').length,
    contra: rows.filter((r) => r.vote === 'contra').length,
    mine: (rows.find((r) => r.clerk_user_id === userId)?.vote as VoteChoice | undefined) ?? null,
  }
}
