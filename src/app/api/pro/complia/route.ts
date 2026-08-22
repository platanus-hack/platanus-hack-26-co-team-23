import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from 'octokit'
import { generateCompliaMd } from '@/lib/pro/complia-md'
import { listRepoPaths } from '@/lib/pro/github'

export const maxDuration = 120

/** POST { repo: "owner/nombre" } → { markdown } — el COMPLIA.md propuesto para ese repo. */
export async function POST(req: NextRequest) {
  const { repo: full } = await req.json()
  const [owner, repo] = String(full ?? '').split('/')
  if (!owner || !repo) return NextResponse.json({ error: 'repo inválido (owner/nombre)' }, { status: 400 })

  try {
    const gh = new Octokit({ auth: process.env.GITHUB_TOKEN })
    const paths = (await listRepoPaths(gh, owner, repo))
      .filter((p) => /\.(ts|tsx|js|json|md)$/.test(p))
      .slice(0, 25)
    const files = await Promise.all(
      paths.map(async (path) => {
        const { data } = await gh.rest.repos.getContent({ owner, repo, path })
        return { path, content: 'content' in data ? Buffer.from(data.content, 'base64').toString() : '' }
      }),
    )
    return NextResponse.json({ markdown: await generateCompliaMd(full, files) })
  } catch (e) {
    console.error('generateCompliaMd falló:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
