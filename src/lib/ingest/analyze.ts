import { z } from 'zod'
import { anthropic, MODEL } from '@/lib/llm'
import { SECTORS } from '@/lib/types'

const AnalysisSchema = z.object({
  summary: z.string().min(10),
  sectors: z.array(z.enum(SECTORS)),
  company_types: z.array(z.string()),
  obligations: z.array(z.object({ action: z.string(), deadline: z.string().nullable() })),
  severity: z.enum(['info', 'low', 'medium', 'high']),
})
export type NormAnalysis = z.infer<typeof AnalysisSchema>

export function parseAnalysis(text: string): NormAnalysis {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('sin JSON en la respuesta')
  return AnalysisSchema.parse(JSON.parse(text.slice(start, end + 1)))
}

const SYSTEM = `Eres un analista regulatorio colombiano. Analiza la norma y registra el resultado
con la herramienta. Sé conservador: si la norma no afecta empresas, sectors=[] y severity=info.
severity=high solo si crea obligaciones con sanción.`

// Tool use forzado: el modelo solo puede responder con el JSON del schema — cero parsing frágil.
const ANALYSIS_TOOL = {
  name: 'registrar_analisis',
  description: 'Registra el análisis estructurado de una norma colombiana',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: { type: 'string', description: 'Resumen en 1-2 frases: qué cambia y a quién obliga' },
      sectors: { type: 'array', items: { type: 'string', enum: [...SECTORS] } },
      company_types: { type: 'array', items: { type: 'string', enum: ['SAS', 'SA', 'LTDA', 'persona natural'] } },
      obligations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string', description: 'Obligación concreta' },
            deadline: { type: ['string', 'null'], description: 'YYYY-MM-DD o null' },
          },
          required: ['action', 'deadline'],
        },
      },
      severity: { type: 'string', enum: ['info', 'low', 'medium', 'high'] },
    },
    required: ['summary', 'sectors', 'company_types', 'obligations', 'severity'],
  },
}

export async function analyzeNorm(title: string, rawText: string): Promise<NormAnalysis> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: SYSTEM,
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: 'tool', name: 'registrar_analisis' },
    messages: [{ role: 'user', content: `TÍTULO: ${title}\n\nTEXTO:\n${rawText.slice(0, 30000)}` }],
  })
  const block = msg.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('sin tool_use en la respuesta')
  return AnalysisSchema.parse(block.input)
}
