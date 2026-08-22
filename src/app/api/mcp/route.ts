import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { validateApiKey, unauthorized } from '@/lib/api-keys'
import { SECTORS } from '@/lib/types'

const NORM_FIELDS = 'title, issuer, norm_type, published_at, summary, sectors, obligations, severity, url'
const asText = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data ?? [], null, 2) }] })

const handler = createMcpHandler((server) => {
  server.registerTool(
    'buscar_normas',
    {
      description: 'Busca normativa colombiana reciente por texto libre en el título/resumen.',
      inputSchema: { query: z.string(), limit: z.number().max(20).default(5) },
    },
    async ({ query, limit }) => {
      const db = supabaseAdmin()
      const { data } = await db.from('norms')
        .select(NORM_FIELDS)
        .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
        .not('analyzed_at', 'is', null)
        .order('published_at', { ascending: false }).limit(limit)
      return asText(data)
    },
  )
  server.registerTool(
    'normas_por_sector',
    {
      description: `Normativa colombiana reciente que afecta a un sector. Sectores válidos: ${SECTORS.join(', ')}.`,
      inputSchema: { sector: z.enum(SECTORS), limit: z.number().max(20).default(10) },
    },
    async ({ sector, limit }) => {
      const db = supabaseAdmin()
      const { data } = await db.from('norms')
        .select(NORM_FIELDS)
        .contains('sectors', [sector])
        .not('analyzed_at', 'is', null)
        .order('published_at', { ascending: false }).limit(limit)
      return asText(data)
    },
  )
})

// Acceso con API key (generada en /keys). MASTER_API_KEY del env = key de demo rotable.
const guarded = async (req: Request) => {
  if (!(await validateApiKey(req))) return unauthorized()
  return handler(req)
}

export { guarded as GET, guarded as POST }
