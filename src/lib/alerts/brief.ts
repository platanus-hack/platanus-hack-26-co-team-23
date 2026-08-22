import { z } from 'zod'
import { anthropic, MODEL } from '@/lib/llm'
import type { Company, Norm } from '@/lib/types'

/**
 * What the company gets when a norm applies to it: what changed, why it affects
 * THEM, what they risk by doing nothing, and the steps. Generated once and stored
 * in `alerts.brief` so every channel (email, Slack, WhatsApp, the PDF guide) says
 * exactly the same thing.
 *
 * Field names stay in Spanish because they are the JSON the model fills in and the
 * copy is delivered to Colombian users verbatim.
 */
export const BriefSchema = z.object({
  que_cambio: z.string().min(1),
  por_que_te_afecta: z.string().min(1),
  si_no_haces_nada: z.string().min(1),
  pasos: z
    .array(
      z.object({
        titulo: z.string().min(1),
        detalle: z.string().min(1),
        responsable: z.string().min(1),
      }),
    )
    .min(1),
  plazo: z.string().nullable(),
})
export type Brief = z.infer<typeof BriefSchema>

// Prompt stays in Spanish: it produces the copy the Colombian user reads.
const SYSTEM = `Escribes el aviso que recibe una PYME colombiana cuando una norma le aplica.
Le hablas al dueño o al contador, no a un abogado: frases cortas, sin latinajos, sin citar
artículos salvo que el número sea lo que hay que buscar.

- que_cambio: qué cambió en concreto, en 1-2 frases. Si hay fecha de entrada en vigencia, dila.
- por_que_te_afecta: por qué le toca a ESTA empresa — usa su sector y su tipo de sociedad.
  Si le aplica solo en parte, dilo.
- si_no_haces_nada: la consecuencia real. Menciona sanciones, montos o plazos SOLO si vienen
  en la norma; si no los tienes, describe el riesgo sin inventar cifras
  (rechazo de documentos, hallazgos en una visita, suspensión de un trámite).
- pasos: 2 a 5 acciones concretas y verificables, en orden. Nada de "asesórate con un experto"
  como primer paso. responsable = un rol de la empresa (contador, TI, gerencia, RRHH).
- plazo: la fecha límite en texto claro, o null si la norma no fija una.

Nunca inventes cifras, artículos ni fechas que no estén en lo que te dan.`

const BRIEF_TOOL = {
  name: 'registrar_aviso',
  description: 'Registra el aviso que se le entrega a la empresa sobre una norma que le aplica',
  input_schema: {
    type: 'object' as const,
    properties: {
      que_cambio: { type: 'string', description: 'Qué cambió, 1-2 frases' },
      por_que_te_afecta: { type: 'string', description: 'Por qué le aplica a esta empresa' },
      si_no_haces_nada: { type: 'string', description: 'Consecuencia de no actuar' },
      pasos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            titulo: { type: 'string', description: 'La acción, en imperativo' },
            detalle: { type: 'string', description: 'Cómo hacerla, 1-2 frases' },
            responsable: { type: 'string', description: 'Rol de la empresa que la ejecuta' },
          },
          required: ['titulo', 'detalle', 'responsable'],
        },
      },
      plazo: { type: ['string', 'null'], description: 'Fecha límite en texto, o null' },
    },
    required: ['que_cambio', 'por_que_te_afecta', 'si_no_haces_nada', 'pasos', 'plazo'],
  },
}

export async function generateBrief(
  norm: Pick<Norm, 'title' | 'summary' | 'obligations' | 'severity' | 'source' | 'published_at'>,
  company: Pick<Company, 'name' | 'company_type' | 'sectors'>,
  impact: string,
): Promise<Brief> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    tools: [BRIEF_TOOL],
    tool_choice: { type: 'tool', name: 'registrar_aviso' },
    messages: [
      {
        role: 'user',
        content: [
          `EMPRESA: ${company.name} — ${company.company_type}, sectores: ${company.sectors.join(', ') || 'sin declarar'}`,
          `NORMA: ${norm.title}`,
          `FUENTE: ${norm.source ?? 'no indicada'} · PUBLICADA: ${norm.published_at ?? 'sin fecha'}`,
          `SEVERIDAD: ${norm.severity ?? 'no clasificada'}`,
          `RESUMEN: ${norm.summary ?? 'sin resumen'}`,
          `OBLIGACIONES: ${JSON.stringify(norm.obligations ?? [])}`,
          `IMPACTO CALCULADO: ${impact}`,
        ].join('\n'),
      },
    ],
  })
  const block = msg.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('no tool_use in response')
  return BriefSchema.parse(block.input)
}
