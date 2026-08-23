import type { SourceAdapter, SourceNorm } from '../types'

// legalize-dev/legalize-co (github.com/legalize-dev/legalize-co): the Legalize.dev pipeline
// commits Colombian legislation into a public GitHub repo. MIT-licensed pipeline code, and
// the legislation itself is public domain (official government texts). No API, no key: we
// read the commit log directly through GitHub's REST API.
//
// Each reform to an article is one commit, with a "[reform] <NORM> — art. <N>" subject and
// a structured trailer in the body (Norma/Disposición/Fecha/Fuente + Source-Id/Source-Date/
// Norm-Id). Verified live on 2026-08-22: 95/100 of the most recent commits are reforms, all
// with every trailer present, and the commit order already tracks Source-Date descending.
const REPO = 'legalize-dev/legalize-co'
const COMMIT_MESSAGE_TRAILERS = {
  normId: /\nNorm-Id: (\S+)/,
  sourceId: /\nSource-Id: (\S+)/,
  sourceDate: /\nSource-Date: (\d{4}-\d{2}-\d{2})/,
  source: /\nFuente: (\S+)/,
  article: /\nArtículos afectados: ([\s\S]*?)\n\n/,
} as const

/**
 * `sha` is what makes the row unique. The `Source-Id` trailer looked like a per-reform id
 * and the code treated it as one, but it identifies the NORM: every reform to Ley 599 of
 * 2000 carries the same one, so reforms to art. 296 and to art. 58 collapsed onto a single
 * row and the upsert kept only the last page's version. One commit is one reform, and the
 * sha is stable across runs, so it is the honest key.
 */
export function parseLegalizeCommit(message: string, sha: string): SourceNorm | null {
  if (!message.startsWith('[reform]')) return null // skip bootstrap/fix-pipeline commits

  const normId = message.match(COMMIT_MESSAGE_TRAILERS.normId)?.[1]
  const sourceId = message.match(COMMIT_MESSAGE_TRAILERS.sourceId)?.[1]
  const sourceDate = message.match(COMMIT_MESSAGE_TRAILERS.sourceDate)?.[1]
  if (!normId || !sourceId || !sourceDate) return null // malformed trailer, skip rather than guess

  const title = message.split('\n')[0].replace(/^\[reform\]\s*/, '')
  const article = message.match(COMMIT_MESSAGE_TRAILERS.article)?.[1]?.trim()
  const url = message.match(COMMIT_MESSAGE_TRAILERS.source)?.[1] ?? null
  const [normType] = normId.split('-')

  return {
    external_id: `legalize-${sha.slice(0, 12)}`,
    source: 'legalize',
    title,
    issuer: null, // this dataset doesn't carry the issuing entity
    norm_type: normType.toLowerCase(),
    published_at: sourceDate,
    url,
    raw_text: [`${title} (${normId})`, article].filter(Boolean).join('\n\n'),
  }
}

type GithubCommit = { sha: string; commit: { message: string } }

export const legalize: SourceAdapter = {
  id: 'legalize',
  async fetch(limit = 25, offset = 0) {
    // per_page mirrors `limit` and page is derived from `offset` so the windows line up:
    // an over-fetch buffer plus a client-side .slice() would have left gaps between pages
    // (page 1 would return 30 commits and keep 15, and page 2 would resume at commit 31).
    // The ~5% of commits that aren't reforms just make a page yield slightly under `limit`.
    const perPage = Math.min(limit, 100)
    const page = Math.floor(offset / limit) + 1 // GitHub's pages are 1-based
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    // Optional: an unauthenticated GitHub call is capped at 60 req/hour per IP; reusing the
    // repo's own GITHUB_TOKEN (already provisioned for the PRO track) raises that to 5000/hour.
    // Read-only against a public repo, so no extra scope risk.
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

    const res = await fetch(`https://api.github.com/repos/${REPO}/commits?per_page=${perPage}&page=${page}`, { headers })
    if (!res.ok) throw new Error(`GitHub ${res.status}`)
    const commits = (await res.json()) as GithubCommit[]

    return commits
      .map((c) => parseLegalizeCommit(c.commit.message, c.sha))
      .filter((n): n is SourceNorm => n !== null)
      // Defensive: sort by the real reform date rather than trusting the API's commit order.
      // Sorted within the page only — no .slice(), or the trimmed rows would be lost for good.
      .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
  },
}
