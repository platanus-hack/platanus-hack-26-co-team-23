import { anthropic, MODEL } from '@/lib/llm'

type NormLike = { title: string; summary: string | null; obligations: unknown }
type CompanyLike = { name: string; company_type: string; sectors: string[] }

// Forced tool use = guaranteed structured output, robust against thinking blocks.
const IMPACT_TOOL = {
  name: 'registrar_impacto',
  description: 'Registra cómo una norma afecta a una empresa concreta y qué debe hacer',
  input_schema: {
    type: 'object' as const,
    properties: {
      impact: { type: 'string', description: 'Cómo afecta esta norma a ESTA empresa. MÁXIMO 2 frases.' },
      recommendation: { type: 'string', description: 'Acción concreta de mitigación/cumplimiento. MÁXIMO 2 frases.' },
    },
    required: ['impact', 'recommendation'],
  },
}

// Output stays in Spanish (target audience) — driven by the Spanish tool/prompt.
export async function generateImpact(
  company: CompanyLike,
  norm: NormLike,
): Promise<{ impact: string; recommendation: string }> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 900,
    tools: [IMPACT_TOOL],
    tool_choice: { type: 'tool', name: 'registrar_impacto' },
    system: 'Eres asesor de cumplimiento. Español, directo, sin jerga legal. Sé breve: máximo 2 frases por campo — es una alerta, no un informe.',
    messages: [{
      role: 'user',
      content:
        `EMPRESA: ${company.name} (${company.company_type}), sectores: ${company.sectors.join(', ')}\n` +
        `NORMA: ${norm.title}\nRESUMEN: ${norm.summary}\nOBLIGACIONES: ${JSON.stringify(norm.obligations)}`,
    }],
  })
  const block = msg.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('no tool_use in impact response')
  const out = block.input as { impact: string; recommendation: string }
  return { impact: out.impact, recommendation: out.recommendation }
}
