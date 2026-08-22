#!/usr/bin/env node
// complai-mcp: cliente stdio delgado. NO lleva credenciales — solo consume la API
// pública read-only de complAI (las normas son datos públicos).
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
    throw new Error('API key requerida: exporta COMPLAI_API_KEY (genérala en https://complai-co.vercel.app/keys)')
  if (res.status === 429) throw new Error('Rate limit excedido, reintenta en un momento.')
  if (!res.ok) throw new Error(`complAI API ${res.status}`)
  return res.json()
}

const asText = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] })

const server = new McpServer({ name: 'complai', version: '0.4.0' })

// --- consulta ---
server.tool(
  'buscar_normas',
  'Busca normativa colombiana reciente por texto libre en título/resumen.',
  { query: z.string(), limit: z.number().max(20).default(5) },
  async ({ query, limit }) => asText(await call('/api/public/norms', { params: { q: query, limit } })),
)
server.tool(
  'normas_por_sector',
  `Normativa colombiana reciente que afecta a un sector. Válidos: ${SECTORS.join(', ')}.`,
  { sector: z.enum(SECTORS), limit: z.number().max(20).default(10) },
  async ({ sector, limit }) => asText(await call('/api/public/norms', { params: { sector, limit } })),
)

// --- diferenciadores ---
server.tool(
  'cambios_recientes',
  'Feed de cambio normativo: qué normativa colombiana salió desde una fecha, por sector y severidad mínima. Responde "¿qué cambió esta semana?".',
  {
    desde: z.string().describe('Fecha ISO YYYY-MM-DD').optional(),
    sector: z.enum(SECTORS).optional(),
    severidad_min: z.enum(SEVERITIES).default('low'),
    limit: z.number().max(20).default(10),
  },
  async (a) => asText(await call('/api/public/cambios', { params: a })),
)
server.tool(
  'normas_que_me_aplican',
  'Dado el perfil de una empresa (tipo de sociedad + sectores), devuelve SOLO la normativa que le aplica. Matching real contra el perfil, no búsqueda por tema.',
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
  'Calendario de cumplimiento: obligaciones concretas con fecha límite, ordenadas por deadline. Filtrable por sector y fecha tope.',
  {
    sector: z.enum(SECTORS).optional(),
    antes_de: z.string().describe('Solo obligaciones con deadline <= esta fecha ISO').optional(),
    limit: z.number().max(20).default(15),
  },
  async (a) => asText(await call('/api/public/obligaciones', { params: a })),
)
server.tool(
  'plan_remediacion_codigo',
  'Dada una norma (por id o título), devuelve un plan concreto de cambios de código para cumplirla: qué tocar, qué modificar y cómo verificar. De la norma al código.',
  {
    norma: z.string().describe('external_id (ej: dian-resolucion_dian_0011_2026) o título/tema'),
    stack: z.string().describe('Stack o descripción técnica del cliente, opcional').optional(),
  },
  async ({ norma, stack }) => asText(await call('/api/public/remediacion', { body: { norma, stack } })),
)

await server.connect(new StdioServerTransport())
