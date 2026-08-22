#!/usr/bin/env node
// complai-mcp: thin stdio client. Carries NO credentials — it only consumes complAI's
// public read-only API (norms are public data).
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const API = process.env.COMPLAI_API_URL ?? 'https://complai-co.vercel.app'
const API_KEY = process.env.COMPLAI_API_KEY ?? ''
const SECTORS = ['fintech', 'salud', 'alimentos', 'transporte', 'construccion',
  'comercio', 'tecnologia', 'datos-personales', 'laboral-general', 'tributario-general']
const COMPANY_TYPES = ['SAS', 'SA', 'LTDA', 'persona natural']
const SEVERITIES = ['low', 'medium', 'high']

async function call(path, { params, body } = {}) {
  const url = new URL(`${API}${path}`)
  for (const [k, v] of Object.entries(params ?? {})) if (v != null && v !== '') url.searchParams.set(k, v)
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-api-key': API_KEY, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401)
    throw new Error('API key required: export COMPLAI_API_KEY (generate one at https://complai-co.vercel.app/keys)')
  if (res.status === 429) throw new Error('Rate limit exceeded, try again in a moment.')
  if (!res.ok) throw new Error(`complAI API ${res.status}`)
  return res.json()
}

const asText = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] })

const server = new McpServer({ name: 'complai', version: '0.4.0' })

// --- query ---
server.tool(
  'buscar_normas',
  'Searches recent Colombian regulation by free text over title/summary.',
  { query: z.string(), limit: z.number().max(20).default(5) },
  async ({ query, limit }) => asText(await call('/api/public/norms', { params: { q: query, limit } })),
)
server.tool(
  'normas_por_sector',
  `Recent Colombian regulation affecting a sector. Valid values: ${SECTORS.join(', ')}.`,
  { sector: z.enum(SECTORS), limit: z.number().max(20).default(10) },
  async ({ sector, limit }) => asText(await call('/api/public/norms', { params: { sector, limit } })),
)

// --- differentiators ---
server.tool(
  'cambios_recientes',
  'Regulatory change feed: which Colombian regulation came out since a date, by sector and minimum severity. Answers "what changed this week?".',
  {
    desde: z.string().describe('ISO date YYYY-MM-DD').optional(),
    sector: z.enum(SECTORS).optional(),
    severidad_min: z.enum(SEVERITIES).default('low'),
    limit: z.number().max(20).default(10),
  },
  async (a) => asText(await call('/api/public/cambios', { params: a })),
)
server.tool(
  'normas_que_me_aplican',
  'Given a company profile (company type + sectors), returns ONLY the regulation that applies to it. Real matching against the profile, not topic search.',
  {
    tipo_empresa: z.enum(COMPANY_TYPES),
    sectores: z.array(z.enum(SECTORS)).min(1),
    severidad_min: z.enum(SEVERITIES).default('low'),
    limit: z.number().max(20).default(10),
  },
  async ({ tipo_empresa, sectores, severidad_min, limit }) =>
    asText(await call('/api/public/aplica', {
      params: { tipo_empresa, sectores: sectores.join(','), severidad_min, limit },
    })),
)
server.tool(
  'obligaciones_con_deadline',
  'Compliance calendar: concrete obligations with a deadline, ordered by due date. Filterable by sector and cutoff date.',
  {
    sector: z.enum(SECTORS).optional(),
    antes_de: z.string().describe('Only obligations with a deadline <= this ISO date').optional(),
    limit: z.number().max(20).default(15),
  },
  async (a) => asText(await call('/api/public/obligaciones', { params: a })),
)
server.tool(
  'plan_remediacion_codigo',
  'Given a norm (by id or title), returns a concrete code-change plan to comply with it: what to touch, what to modify, and how to verify. From norm to code.',
  {
    norma: z.string().describe('external_id (e.g. dian-resolucion_dian_0011_2026) or the norm\'s title/topic'),
    stack: z.string().describe('Client stack or technical description, optional').optional(),
  },
  async ({ norma, stack }) => asText(await call('/api/public/remediacion', { body: { norma, stack } })),
)

await server.connect(new StdioServerTransport())
