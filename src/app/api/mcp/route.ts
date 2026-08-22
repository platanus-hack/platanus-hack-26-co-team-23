import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { withApiGuard } from '@/lib/api-guard'
import {
  NORM_FIELDS, recentChanges, normsForProfile, obligationsWithDeadline, remediationPlan,
} from '@/lib/norms-queries'
import { SECTORS, COMPANY_TYPES } from '@/lib/types'

const asText = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data ?? [], null, 2) }] })
const SEVERITIES = ['low', 'medium', 'high'] as const

const handler = createMcpHandler((server) => {
  // --- query (table parity) ---
  server.registerTool(
    'buscar_normas',
    {
      description: 'Searches recent Colombian regulation by free text over title/summary.',
      inputSchema: { query: z.string(), limit: z.number().max(20).default(5) },
    },
    async ({ query, limit }) => {
      const { data } = await supabaseAdmin().from('norms').select(NORM_FIELDS)
        .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
        .not('analyzed_at', 'is', null)
        .order('published_at', { ascending: false }).limit(limit)
      return asText(data)
    },
  )
  server.registerTool(
    'normas_por_sector',
    {
      description: `Recent Colombian regulation affecting a sector. Valid sectors: ${SECTORS.join(', ')}.`,
      inputSchema: { sector: z.enum(SECTORS), limit: z.number().max(20).default(10) },
    },
    async ({ sector, limit }) => {
      const { data } = await supabaseAdmin().from('norms').select(NORM_FIELDS)
        .contains('sectors', [sector]).not('analyzed_at', 'is', null)
        .order('published_at', { ascending: false }).limit(limit)
      return asText(data)
    },
  )

  // --- differentiators: change × profile × obligations × remediation ---
  server.registerTool(
    'cambios_recientes',
    {
      description: 'Regulatory change feed: which Colombian regulation came out since a date, filterable by sector and minimum severity. Use it to answer "what changed this week?".',
      inputSchema: {
        desde: z.string().describe('ISO date YYYY-MM-DD (e.g. 7 days ago)').optional(),
        sector: z.enum(SECTORS).optional(),
        severidad_min: z.enum(SEVERITIES).default('low'),
        limit: z.number().max(20).default(10),
      },
    },
    async ({ desde, sector, severidad_min, limit }) =>
      asText(await recentChanges({ desde, sector, severidadMin: severidad_min, limit })),
  )
  server.registerTool(
    'normas_que_me_aplican',
    {
      description: 'Given a company profile (company type + sectors), returns ONLY the regulation that applies to it, with its severity and obligations. Real matching against the profile, not topic search.',
      inputSchema: {
        tipo_empresa: z.enum(COMPANY_TYPES),
        sectores: z.array(z.enum(SECTORS)).min(1),
        severidad_min: z.enum(SEVERITIES).default('low'),
        limit: z.number().max(20).default(10),
      },
    },
    async ({ tipo_empresa, sectores, severidad_min, limit }) =>
      asText(await normsForProfile({ tipoEmpresa: tipo_empresa, sectores, severidadMin: severidad_min, limit })),
  )
  server.registerTool(
    'obligaciones_con_deadline',
    {
      description: 'Compliance calendar: concrete obligations with a deadline extracted from regulation, ordered by due date. Filterable by sector and cutoff date.',
      inputSchema: {
        sector: z.enum(SECTORS).optional(),
        antes_de: z.string().describe('Only obligations with a deadline <= this ISO date').optional(),
        limit: z.number().max(20).default(15),
      },
    },
    async ({ sector, antes_de, limit }) =>
      asText(await obligationsWithDeadline({ sector, antesDe: antes_de, limit })),
  )
  server.registerTool(
    'plan_remediacion_codigo',
    {
      description: 'Given a norm (by id or title), returns a concrete code-change plan to comply with it: which components to touch, what to modify, and how to verify. complAI\'s differentiator: from norm to code.',
      inputSchema: {
        norma: z.string().describe('external_id (e.g. dian-resolucion_dian_0011_2026) or the norm\'s title/topic'),
        stack: z.string().describe('Client stack or technical description, optional').optional(),
      },
    },
    async ({ norma, stack }) => asText(await remediationPlan({ norma, stack })),
  )
})

export const GET = withApiGuard(handler)
export const POST = withApiGuard(handler)
