import { supabaseAdmin } from '@/lib/supabase/admin'
import { anthropic, MODEL } from '@/lib/llm'

export const NORM_FIELDS =
  'external_id, title, issuer, norm_type, published_at, summary, sectors, company_types, obligations, severity, url'

const RANK: Record<string, number> = { low: 1, medium: 2, high: 3 }
const atOrAbove = (min: string) => Object.keys(RANK).filter((s) => RANK[s] >= (RANK[min] ?? 1))

const clampLimit = (n: number | undefined, def = 10) => Math.min(Math.max(Number(n) || def, 1), 20)

// ---- cambios_recientes: el feed de "qué cambió" (diferenciador vs Croma/buscadores) ----
export async function recentChanges(opts: {
  desde?: string; sector?: string; severidadMin?: string; limit?: number
}) {
  const db = supabaseAdmin()
  let q = db.from('norms').select(NORM_FIELDS)
    .not('analyzed_at', 'is', null)
    .in('severity', atOrAbove(opts.severidadMin ?? 'low')) // excluye 'info' (ruido)
    .order('published_at', { ascending: false })
    .limit(clampLimit(opts.limit))
  if (opts.desde) q = q.gte('published_at', opts.desde)
  if (opts.sector) q = q.contains('sectors', [opts.sector])
  return (await q).data ?? []
}

// ---- normas_que_me_aplican: matching contra perfil de empresa (inédito como tool MCP) ----
export async function normsForProfile(opts: {
  tipoEmpresa: string; sectores: string[]; severidadMin?: string; limit?: number
}) {
  const db = supabaseAdmin()
  const limit = clampLimit(opts.limit)
  // sector overlap + severidad en SQL; el filtro de tipo de empresa en JS (evita
  // el quoting frágil de arrays con espacios como "persona natural" en PostgREST)
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

// ---- obligaciones_con_deadline: calendario de cumplimiento (obligations estructuradas) ----
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

// ---- plan_remediacion_codigo: de la norma al plan de cambios en el código (el diferenciador ACCESS) ----
export async function remediationPlan(opts: { norma: string; stack?: string }) {
  const db = supabaseAdmin()
  // resolver por external_id exacto, si no por título/summary
  const byId = await db.from('norms').select(NORM_FIELDS).eq('external_id', opts.norma).maybeSingle()
  const norm = byId.data ?? (await db.from('norms').select(NORM_FIELDS)
    .or(`title.ilike.%${opts.norma}%,summary.ilike.%${opts.norma}%`)
    .not('analyzed_at', 'is', null).limit(1).maybeSingle()).data
  if (!norm) return { error: `No encontré una norma que coincida con "${opts.norma}".` }

  // tool_use forzado: salida estructurada garantizada, robusta ante bloques de thinking
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2500,
    tools: [{
      name: 'registrar_plan',
      description: 'Registra el plan de remediación de código para cumplir una norma',
      input_schema: {
        type: 'object',
        properties: {
          resumen: { type: 'string', description: 'Qué exige la norma a nivel técnico (1-2 frases)' },
          cambios: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                area: { type: 'string', description: 'Componente/archivo típico afectado' },
                cambio: { type: 'string', description: 'Qué modificar' },
                razon: { type: 'string', description: 'Qué obligación lo exige' },
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
    system: 'Eres un ingeniero senior que traduce una norma colombiana en un plan concreto de cambios de código para cumplirla. Sé accionable. Si la norma no implica cambios de software, cambios=[] y explícalo en resumen.',
    messages: [{
      role: 'user',
      content: `NORMA: ${norm.title}\nRESUMEN: ${norm.summary}\nOBLIGACIONES: ${JSON.stringify(norm.obligations)}` +
        (opts.stack ? `\n\nSTACK DEL CLIENTE: ${opts.stack}` : ''),
    }],
  })
  const block = msg.content.find((b) => b.type === 'tool_use')
  const plan = block && block.type === 'tool_use' ? block.input : {}
  return { norma: norm.title, norm_id: norm.external_id, url: norm.url, ...plan }
}
