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
  if (start === -1 || end === -1) throw new Error('no JSON in the response')
  return AnalysisSchema.parse(JSON.parse(text.slice(start, end + 1)))
}

const SYSTEM = `You are a Colombian regulatory analyst. Analyze the norm and record the result
with the tool. Be conservative: if the norm doesn't affect companies, sectors=[] and severity=info.
severity=high only if it creates obligations with a penalty.`

// Forced tool use: the model can only respond with the schema's JSON — zero fragile parsing.
const ANALYSIS_TOOL = {
  name: 'registrar_analisis',
  description: 'Records the structured analysis of a Colombian norm',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: { type: 'string', description: '1-2 sentence summary: what changes and who it obligates' },
      sectors: { type: 'array', items: { type: 'string', enum: [...SECTORS] } },
      company_types: { type: 'array', items: { type: 'string', enum: ['SAS', 'SA', 'LTDA', 'persona natural'] } },
      obligations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string', description: 'Concrete obligation' },
            deadline: { type: ['string', 'null'], description: 'YYYY-MM-DD or null' },
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
    messages: [{ role: 'user', content: `TITLE: ${title}\n\nTEXT:\n${rawText.slice(0, 30000)}` }],
  })
  const block = msg.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('no tool_use in the response')
  return AnalysisSchema.parse(block.input)
}
