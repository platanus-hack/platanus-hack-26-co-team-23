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
  // --- consulta (paridad de tabla) ---
  server.registerTool(
    'buscar_normas',
    {
      description: 'Busca normativa colombiana reciente por texto libre en el título/resumen.',
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
      description: `Normativa colombiana reciente que afecta a un sector. Sectores: ${SECTORS.join(', ')}.`,
      inputSchema: { sector: z.enum(SECTORS), limit: z.number().max(20).default(10) },
    },
    async ({ sector, limit }) => {
      const { data } = await supabaseAdmin().from('norms').select(NORM_FIELDS)
        .contains('sectors', [sector]).not('analyzed_at', 'is', null)
        .order('published_at', { ascending: false }).limit(limit)
      return asText(data)
    },
  )

  // --- diferenciadores: cambio × perfil × obligaciones × remediación ---
  server.registerTool(
    'cambios_recientes',
    {
      description: 'Feed de cambio normativo: qué normativa colombiana salió desde una fecha, filtrable por sector y severidad mínima. Úsalo para responder "¿qué cambió esta semana?".',
      inputSchema: {
        desde: z.string().describe('Fecha ISO YYYY-MM-DD (ej: hace 7 días)').optional(),
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
      description: 'Dado el perfil de una empresa (tipo de sociedad + sectores), devuelve SOLO la normativa que le aplica, con su severidad y obligaciones. Matching real contra el perfil, no búsqueda por tema.',
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
      description: 'Calendario de cumplimiento: obligaciones concretas con fecha límite extraídas de la normativa, ordenadas por deadline. Filtrable por sector y fecha tope.',
      inputSchema: {
        sector: z.enum(SECTORS).optional(),
        antes_de: z.string().describe('Solo obligaciones con deadline <= esta fecha ISO').optional(),
        limit: z.number().max(20).default(15),
      },
    },
    async ({ sector, antes_de, limit }) =>
      asText(await obligationsWithDeadline({ sector, antesDe: antes_de, limit })),
  )
  server.registerTool(
    'plan_remediacion_codigo',
    {
      description: 'Dada una norma (por id o título), devuelve un plan concreto de cambios de código para cumplirla: qué componentes tocar, qué modificar y cómo verificar. El diferenciador de complAI: de la norma al código.',
      inputSchema: {
        norma: z.string().describe('external_id (ej: dian-resolucion_dian_0011_2026) o título/tema de la norma'),
        stack: z.string().describe('Stack o descripción técnica del cliente, opcional').optional(),
      },
    },
    async ({ norma, stack }) => asText(await remediationPlan({ norma, stack })),
  )
})

export const GET = withApiGuard(handler)
export const POST = withApiGuard(handler)
