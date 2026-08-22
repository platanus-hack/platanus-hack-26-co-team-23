import { anthropic, MODEL } from '@/lib/llm'

/**
 * COMPLIA.md is the context file that lives at the root of the client's repo:
 * it describes what the repo does and which files matter for regulatory compliance.
 * It's free-form prose — the only thing the agent extracts deterministically are the
 * paths written in `backticks` that actually exist in the repo's tree.
 */
export const COMPLIA_FILENAMES = ['COMPLIA.md', 'complia.md', '.complia.md']

/**
 * Paths mentioned in backticks that exist in the repo. A backtick path ending
 * in "/" expands to every file under that folder.
 * Validating against the real tree keeps the manifest from making anything readable.
 */
export function parseCompliaPaths(md: string, repoPaths: string[]): string[] {
  const known = new Set(repoPaths)
  const found = new Set<string>()
  for (const [, raw] of md.matchAll(/`([^`\n]+)`/g)) {
    const p = raw.trim().replace(/^\.\//, '')
    if (known.has(p)) found.add(p)
    else if (p.endsWith('/')) for (const r of repoPaths) if (r.startsWith(p)) found.add(r)
  }
  return [...found]
}

const GENERATE_SYSTEM = `You write a repository's COMPLIA.md: the file that tells a
Colombian regulatory-compliance agent what to look at when a new norm arrives.

Respond with ONLY the file's markdown, no explanations or surrounding code blocks.
Structure (keep the section headings below verbatim, in Spanish, since this file is read by
the client's team):

# COMPLIA.md

One or two sentences: what this system does and which regulation touches it (DIAN invoicing,
SIC data protection, SFC reporting, etc.).

## Archivos relevantes

List every file a regulatory change could touch, with its EXACT path in
backticks as it appears in the repo, followed by what it does and which obligation it covers
today. Order from most to least likely. Max 12. Ignore configs, lockfiles, and tests.

## Fuera de alcance

Paths in backticks that the agent must NOT modify, with the reason.

## Notas para el revisor

What to scrutinize in an automatically generated PR.`

/** Generates the content of COMPLIA.md from the repo's files. */
export async function generateCompliaMd(
  repo: string,
  files: { path: string; content: string }[],
): Promise<string> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: GENERATE_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `REPOSITORY: ${repo}\n\nFILES:\n` +
          files.map((f) => `=== ${f.path} ===\n${f.content.slice(0, 6000)}`).join('\n\n'),
      },
    ],
  })
  const text = msg.content.find((b) => b.type === 'text')
  if (!text || text.type !== 'text' || !text.text.trim()) throw new Error('the model did not return a COMPLIA.md')
  return text.text.trim()
}
