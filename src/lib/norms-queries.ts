import { supabaseAdmin } from '@/lib/supabase/admin'
import { anthropic, MODEL } from '@/lib/llm'

export const NORM_FIELDS =
  'external_id, title, issuer, norm_type, published_at, summary, sectors, company_types, obligations, severity, url'

const RANK: Record<string, number> = { low: 1, medium: 2, high: 3 }
const atOrAbove = (min: string) => Object.keys(RANK).filter((s) => RANK[s] >= (RANK[min] ?? 1))

const clampLimit = (n: number | undefined, def = 10) => Math.min(Math.max(Number(n) || def, 1), 20)

// ---- cambios_recientes: the "what changed" feed (differentiator vs Croma/search engines) ----
export async function recentChanges(opts: {
  desde?: string; sector?: string; severidadMin?: string; limit?: number
}) {
  const db = supabaseAdmin()
  let q = db.from('norms').select(NORM_FIELDS)
    .not('analyzed_at', 'is', null)
    .in('severity', atOrAbove(opts.severidadMin ?? 'low')) // excludes 'info' (noise)
    .order('published_at', { ascending: false })
    .limit(clampLimit(opts.limit))
  if (opts.desde) q = q.gte('published_at', opts.desde)
  if (opts.sector) q = q.contains('sectors', [opts.sector])
  return (await q).data ?? []
}

// ---- normas_que_me_aplican: matching against a company profile (novel as an MCP tool) ----
export async function normsForProfile(opts: {
  tipoEmpresa: string; sectores: string[]; severidadMin?: string; limit?: number
}) {
  const db = supabaseAdmin()
  const limit = clampLimit(opts.limit)
  // sector overlap + severity in SQL; company-type filter in JS (avoids
  // fragile quoting of arrays with spaces like "persona natural" in PostgREST)
  const { data } = await db.from('norms').select(NORM_FIELDS)
    .not('analyzed_at', 'is', null)
    .in('severity', atOrAbove(opts.severidadMin ?? 'low'))
    .overlaps('sectors', opts.sectores)
    .order('published_at', { ascending: false })
    .limit(limit * 3)
  return (data ?? [])
    .filter((n) => !n.company_types?.length || n.company_types.includes(opts.tipoEmpresa))
    .slice(0, limit)
}

// ---- obligaciones_con_deadline: compliance calendar (structured obligations) ----
export async function obligationsWithDeadline(opts: {
  sector?: string; antesDe?: string; limit?: number
}) {
  const db = supabaseAdmin()
  let q = db.from('norms').select('external_id, title, url, severity, sectors, obligations')
    .not('analyzed_at', 'is', null)
    .neq('obligations', '[]')
    .limit(80)
  if (opts.sector) q = q.contains('sectors', [opts.sector])
  const rows = (await q).data ?? []

  const items = rows.flatMap((n) =>
    ((n.obligations as { action: string; deadline: string | null }[]) ?? [])
      .filter((o) => o.deadline)
      .filter((o) => !opts.antesDe || o.deadline! <= opts.antesDe)
      .map((o) => ({
        action: o.action, deadline: o.deadline, severity: n.severity,
        norm_title: n.title, norm_id: n.external_id, url: n.url,
      })),
  )
  items.sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))
  return items.slice(0, clampLimit(opts.limit, 15))
}

// ---- plan_remediacion_codigo: from norm to a concrete code-change plan (the ACCESS differentiator) ----
export async function remediationPlan(opts: { norma: string; stack?: string }) {
  const db = supabaseAdmin()
  // resolve by exact external_id, otherwise by title/summary
  const byId = await db.from('norms').select(NORM_FIELDS).eq('external_id', opts.norma).maybeSingle()
  const norm = byId.data ?? (await db.from('norms').select(NORM_FIELDS)
    .or(`title.ilike.%${opts.norma}%,summary.ilike.%${opts.norma}%`)
    .not('analyzed_at', 'is', null).limit(1).maybeSingle()).data
  if (!norm) return { error: `Could not find a norm matching "${opts.norma}".` }

  // forced tool_use: guaranteed structured output, robust against thinking blocks
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2500,
    tools: [{
      name: 'registrar_plan',
      description: 'Records the code remediation plan to comply with a norm',
      input_schema: {
        type: 'object',
        properties: {
          resumen: { type: 'string', description: 'What the norm requires at a technical level (1-2 sentences)' },
          cambios: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                area: { type: 'string', description: 'Typical affected component/file' },
                cambio: { type: 'string', description: 'What to modify' },
                razon: { type: 'string', description: 'Which obligation requires it' },
              },
              required: ['area', 'cambio', 'razon'],
            },
          },
          verificacion: { type: 'string' },
          riesgo_si_no: { type: 'string' },
        },
        required: ['resumen', 'cambios', 'verificacion', 'riesgo_si_no'],
      },
    }],
    tool_choice: { type: 'tool', name: 'registrar_plan' },
    system: 'You are a senior engineer who translates a Colombian norm into a concrete code-change plan to comply with it. Be actionable. If the norm doesn\'t imply software changes, cambios=[] and explain why in resumen.',
    messages: [{
      role: 'user',
      content: `NORM: ${norm.title}\nSUMMARY: ${norm.summary}\nOBLIGATIONS: ${JSON.stringify(norm.obligations)}` +
        (opts.stack ? `\n\nCLIENT STACK: ${opts.stack}` : ''),
    }],
  })
  const block = msg.content.find((b) => b.type === 'tool_use')
  const plan = (block && block.type === 'tool_use' ? block.input : {}) as Record<string, unknown>
  return { norma: norm.title, norm_id: norm.external_id, url: norm.url, ...plan }
}
