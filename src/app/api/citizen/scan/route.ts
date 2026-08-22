import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { buildProfile, fetchAllSources, type SourceResult } from '@/lib/citizen/croma'
import { matchForCitizen } from '@/lib/citizen/match'

// Contaduría alone takes ~54s; the stream stays open until it lands.
export const maxDuration = 120

const CEDULA = /^\d{6,10}$/

/**
 * GET /api/citizen/scan?cedula=… — Server-Sent Events.
 *
 * Free tier, no login. Each public-record source is emitted the moment it answers
 * (4.5s → 54s spread), and the matching norms go out as soon as ADRES lands, so the
 * page fills in progressively instead of waiting for the slowest lookup.
 *
 * Events: `source` per lookup · `matches` with the norms · `done` with the profile.
 */
export async function GET(req: NextRequest) {
  const cedula = (req.nextUrl.searchParams.get('cedula') ?? '').trim()
  if (!CEDULA.test(cedula))
    return Response.json({ error: 'cédula inválida: 6 a 10 dígitos' }, { status: 400 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))

      const results: SourceResult[] = []
      let matchesSent = false
      send('start', { cedula, sources: ['registraduria', 'procuraduria', 'adres', 'contaduria'] })

      // Each lookup resolves independently; whoever finishes first is emitted first.
      const pending = fetchAllSources(cedula).map((p) =>
        p.then(async (r) => {
          results.push(r)
          send('source', r)
          // ADRES carries the only real discriminator (health regime): once it's in,
          // the norm list is worth showing — no need to wait for Contaduría.
          if (r.source === 'adres' && !matchesSent) {
            matchesSent = true
            const matches = await matchForCitizen(buildProfile(cedula, results))
            send('matches', { matches })
          }
        }),
      )
      await Promise.allSettled(pending)

      const profile = buildProfile(cedula, results)
      if (!matchesSent) send('matches', { matches: await matchForCitizen(profile) })

      // Stored as-is, by product decision: this is personal data under Ley 1581.
      await supabaseAdmin()
        .from('citizen_scans')
        .insert({ cedula, profile, sources: results })
        .then(({ error }) => error && console.error('citizen_scan insert failed:', error.message))

      send('done', { profile })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
