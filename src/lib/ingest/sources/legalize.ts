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

export function parseLegalizeCommit(message: string): SourceNorm | null {
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
    external_id: `legalize-${sourceId}`, // the disposition id: stable per article-version reform
    source: 'legalize',
    title,
    issuer: null, // this dataset doesn't carry the issuing entity
    norm_type: normType.toLowerCase(),
    published_at: sourceDate,
    url,
    raw_text: [`${title} (${normId})`, article].filter(Boolean).join('\n\n'),
  }
}

type GithubCommit = { commit: { message: string } }

export const legalize: SourceAdapter = {
  id: 'legalize',
  async fetch(limit = 25) {
    // Buffer above `limit`: ~5% of commits aren't reforms (license/readme/pipeline fixes),
    // and GitHub caps per_page at 100 — plenty for the sizes this pipeline runs at.
    const perPage = Math.min(Math.max(limit * 2, 30), 100)
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    // Optional: an unauthenticated GitHub call is capped at 60 req/hour per IP; reusing the
    // repo's own GITHUB_TOKEN (already provisioned for the PRO track) raises that to 5000/hour.
    // Read-only against a public repo, so no extra scope risk.
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

    const res = await fetch(`https://api.github.com/repos/${REPO}/commits?per_page=${perPage}`, { headers })
    if (!res.ok) throw new Error(`GitHub ${res.status}`)
    const commits = (await res.json()) as GithubCommit[]

    return commits
      .map((c) => parseLegalizeCommit(c.commit.message))
      .filter((n): n is SourceNorm => n !== null)
      // Defensive: sort by the real reform date rather than trusting the API's commit order.
      .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
      .slice(0, limit)
  },
}
