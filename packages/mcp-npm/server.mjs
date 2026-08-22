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

async function fetchNorms(params) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  const res = await fetch(`${API}/api/public/norms?${qs}`, { headers: { 'x-api-key': API_KEY } })
  if (res.status === 401)
    throw new Error('API key requerida: exporta COMPLAI_API_KEY (genérala en https://complai-co.vercel.app/keys)')
  if (!res.ok) throw new Error(`complAI API ${res.status}`)
  return res.json()
}

const asText = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] })

const server = new McpServer({ name: 'complai', version: '0.3.0' })

server.tool(
  'buscar_normas',
  'Busca normativa colombiana reciente por texto libre en título/resumen.',
  { query: z.string(), limit: z.number().max(20).default(5) },
  async ({ query, limit }) => asText(await fetchNorms({ q: query, limit })),
)

server.tool(
  'normas_por_sector',
  `Normativa colombiana reciente que afecta a un sector. Válidos: ${SECTORS.join(', ')}.`,
  { sector: z.enum(SECTORS), limit: z.number().max(20).default(10) },
  async ({ sector, limit }) => asText(await fetchNorms({ sector, limit })),
)

await server.connect(new StdioServerTransport())
