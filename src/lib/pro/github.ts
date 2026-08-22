import { Octokit } from 'octokit'
import { z } from 'zod'
import { anthropic, MODEL } from '@/lib/llm'
import type { Obligation } from '@/lib/types'

const octokit = () => new Octokit({ auth: process.env.GITHUB_TOKEN })

const ProposalSchema = z.object({
  changes: z.array(z.object({ path: z.string().min(1), content: z.string() })),
  pr_body: z.string().min(1),
})
type Proposal = z.infer<typeof ProposalSchema>

const SYSTEM = `Eres un ingeniero que adapta código para cumplir una norma colombiana.
Registra tu propuesta con la herramienta. Cambia SOLO lo necesario para la obligación:
cada archivo en changes debe ir con su CONTENIDO COMPLETO ya modificado, no un diff.
Si ningún archivo del repo es relevante para la norma, changes=[].`

// Tool use forzado: mismo patrón que src/lib/ingest/analyze.ts — cero parsing frágil.
const PROPOSAL_TOOL = {
  name: 'registrar_propuesta',
  description: 'Registra los cambios de código propuestos para cumplir una norma',
  input_schema: {
    type: 'object' as const,
    properties: {
      changes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Ruta del archivo tal como viene del repo' },
            content: { type: 'string', description: 'Contenido COMPLETO del archivo ya modificado' },
          },
          required: ['path', 'content'],
        },
      },
      pr_body: {
        type: 'string',
        description:
          'Markdown: qué norma, qué obliga, qué cambiaste y por qué, qué debe verificar el revisor',
      },
    },
    required: ['changes', 'pr_body'],
  },
}

async function proposeChanges(
  files: { path: string; content: string }[],
  normTitle: string,
  obligations: Obligation[],
  impact: string,
): Promise<Proposal> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    tools: [PROPOSAL_TOOL],
    tool_choice: { type: 'tool', name: 'registrar_propuesta' },
    messages: [
      {
        role: 'user',
        content:
          `NORMA: ${normTitle}\nOBLIGACIONES: ${JSON.stringify(obligations)}\nIMPACTO: ${impact}\n\nARCHIVOS DEL REPO:\n` +
          files.map((f) => `=== ${f.path} ===\n${f.content}`).join('\n\n'),
      },
    ],
  })
  const block = msg.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('sin tool_use en la respuesta')
  return ProposalSchema.parse(block.input)
}

export async function openCompliancePR(args: {
  repo: string
  reviewer: string | null
  normTitle: string
  obligations: Obligation[]
  impact: string
}): Promise<string> {
  const [owner, repo] = args.repo.split('/')
  if (!owner || !repo) throw new Error(`repo inválido: "${args.repo}" (se espera owner/nombre)`)
  const gh = octokit()

  // 1. Leer archivos fuente del repo (código, no node_modules)
  const { data: tree } = await gh.rest.git.getTree({
    owner,
    repo,
    tree_sha: 'HEAD',
    recursive: 'true',
  })
  const paths = (tree.tree ?? [])
    .filter(
      (t) => t.type === 'blob' && /\.(ts|tsx|js|json|md)$/.test(t.path ?? '') && !t.path?.includes('node_modules'),
    )
    .slice(0, 15)
    .map((t) => t.path!)
  const files = await Promise.all(
    paths.map(async (path) => {
      const { data } = await gh.rest.repos.getContent({ owner, repo, path })
      const content = 'content' in data ? Buffer.from(data.content, 'base64').toString() : ''
      return { path, content }
    }),
  )

  // 2. Proponer cambios con Claude
  const { changes, pr_body } = await proposeChanges(files, args.normTitle, args.obligations, args.impact)
  if (!changes.length) throw new Error('el modelo no encontró archivos que corregir')

  // 3. Branch + commits + PR
  const { data: repoInfo } = await gh.rest.repos.get({ owner, repo })
  const base = repoInfo.default_branch
  const { data: baseRef } = await gh.rest.git.getRef({ owner, repo, ref: `heads/${base}` })
  const branch = `complia/cumplimiento-${Date.now()}`
  await gh.rest.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: baseRef.object.sha })
  for (const change of changes) {
    const { data: current } = await gh.rest.repos.getContent({
      owner,
      repo,
      path: change.path,
      ref: branch,
    })
    await gh.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: change.path,
      branch,
      message: `fix: cumplimiento — ${args.normTitle.slice(0, 60)}`,
      content: Buffer.from(change.content).toString('base64'),
      sha: 'sha' in current ? current.sha : undefined,
    })
  }
  // El agente nunca mergea: el PR queda abierto esperando revisión humana.
  const { data: pr } = await gh.rest.pulls.create({
    owner,
    repo,
    base,
    head: branch,
    title: `[CumplIA] Cumplimiento: ${args.normTitle.slice(0, 80)}`,
    body: `${pr_body}\n\n---\n🤖 PR generado por CumplIA. **Requiere revisión humana — nunca mergear sin aprobar.**`,
  })
  if (args.reviewer)
    await gh.rest.pulls
      .requestReviewers({ owner, repo, pull_number: pr.number, reviewers: [args.reviewer] })
      .catch((e) => console.error('no se pudo asignar reviewer:', e))
  return pr.html_url
}
