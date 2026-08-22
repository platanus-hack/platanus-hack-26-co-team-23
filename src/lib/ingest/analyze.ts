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

const SYSTEM = `Eres un analista regulatorio colombiano. Dada una norma, responde SOLO un JSON:
{"summary": "resumen en 1-2 frases de qué cambia y a quién obliga",
 "sectors": [...], // SOLO de: ${SECTORS.join(', ')}
 "company_types": [...], // de: SAS, SA, LTDA, persona natural
 "obligations": [{"action": "obligación concreta", "deadline": "YYYY-MM-DD o null"}],
 "severity": "info|low|medium|high"} // high = crea obligaciones con sanción
Sé conservador: si la norma no afecta empresas, sectors=[] y severity=info.`

export async function analyzeNorm(title: string, rawText: string): Promise<NormAnalysis> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: 'user', content: `TÍTULO: ${title}\n\nTEXTO:\n${rawText.slice(0, 30000)}` }],
  })
  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  return parseAnalysis(text)
}
