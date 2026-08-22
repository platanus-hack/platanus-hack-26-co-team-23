import { describe, it, expect, beforeAll } from 'vitest'
import { buildSpeech, twimlFor, twimlUrl, verifyTwimlSig } from './voice-script'

const ALERT = 'd4c6e8fa-2857-4fae-8634-7da6247756d8'

beforeAll(() => {
  process.env.CRON_SECRET = 'secreto-de-prueba'
  process.env.NEXT_PUBLIC_APP_URL = 'https://complai-co.vercel.app'
})

const base = {
  norm_title: 'Resolución DIAN 000165',
  impact: 'Tus facturas serían rechazadas.',
  recommendation: 'Actualiza el XML.',
}

describe('buildSpeech', () => {
  it('prefiere el brief y añade consecuencia y plazo', () => {
    const speech = buildSpeech({
      ...base,
      brief: {
        que_cambio: 'x',
        por_que_te_afecta: 'Facturas electrónicamente.',
        si_no_haces_nada: 'Te rechazan las facturas.',
        pasos: [{ titulo: 'a', detalle: 'b', responsable: 'TI' }],
        plazo: '1 de octubre',
      },
    })
    expect(speech).toContain('Cómo te afecta: Facturas electrónicamente.')
    expect(speech).toContain('Si no actúas: Te rechazan las facturas.')
    expect(speech).toContain('Plazo: 1 de octubre.')
  })

  it('sin brief cae al impacto y omite las partes que no tiene', () => {
    const speech = buildSpeech({ ...base, brief: null })
    expect(speech).toContain('Cómo te afecta: Tus facturas serían rechazadas.')
    expect(speech).not.toContain('Si no actúas')
    expect(speech).not.toContain('Plazo:')
  })
})

describe('twimlFor', () => {
  it('escapa el XML: un & o un < en el texto romperían el documento', () => {
    const xml = twimlFor('Multas & sanciones <urgente>')
    expect(xml).toContain('Multas &amp; sanciones &lt;urgente&gt;')
    expect(xml).toContain('<Say voice="Polly.Mia" language="es-MX">')
  })
})

describe('firma del TwiML', () => {
  it('acepta la URL que generamos', () => {
    const sig = new URL(twimlUrl(ALERT)).searchParams.get('sig')
    expect(verifyTwimlSig(ALERT, sig)).toBe(true)
  })

  // El endpoint es público (Twilio lo llama sin auth): sin firma, adivinar un id
  // dejaría leer los hallazgos de cumplimiento de esa empresa.
  it('rechaza firma ausente, corrupta o de otra alerta', () => {
    const sig = new URL(twimlUrl(ALERT)).searchParams.get('sig')
    expect(verifyTwimlSig(ALERT, null)).toBe(false)
    expect(verifyTwimlSig(ALERT, 'xxx')).toBe(false)
    expect(verifyTwimlSig('otra-alerta', sig)).toBe(false)
  })
})
