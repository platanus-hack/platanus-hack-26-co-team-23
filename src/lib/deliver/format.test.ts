import { describe, it, expect } from 'vitest'
import { formatAlertText } from './format'
import type { AlertPayload } from './types'

const base: AlertPayload = {
  norm_title: 'Resolución DIAN 000165',
  norm_url: 'https://dian.gov.co/norma',
  norm_issuer: 'DIAN',
  norm_source: 'dian',
  impact: 'Tus facturas serían rechazadas.',
  recommendation: 'Actualiza el XML.',
  severity: 'high',
}

const brief = {
  que_cambio: 'La DIAN exige dos campos nuevos en el XML.',
  por_que_te_afecta: 'Facturas electrónicamente como SAS del sector tecnología.',
  si_no_haces_nada: 'Las facturas serán rechazadas en la validación previa.',
  pasos: [
    { titulo: 'Ubicar los campos', detalle: 'Revisar el anexo técnico.', responsable: 'contador' },
    { titulo: 'Actualizar el XML', detalle: 'Modificar invoice.ts.', responsable: 'TI' },
  ],
  plazo: '1 de octubre de 2026',
}

describe('formatAlertText', () => {
  it('sin brief usa el formato corto, como antes', () => {
    const text = formatAlertText(base)
    expect(text).toContain('*Cómo te afecta:* Tus facturas serían rechazadas.')
    expect(text).toContain('*Qué hacer:* Actualiza el XML.')
    expect(text).not.toContain('Si no haces nada')
  })

  it('con brief entrega las cuatro secciones y los pasos numerados', () => {
    const text = formatAlertText({ ...base, brief, guide_url: 'https://app/api/alerts/1/guia' })
    expect(text).toContain('*Qué cambió:* La DIAN exige dos campos nuevos en el XML.')
    expect(text).toContain('*Por qué te afecta:*')
    expect(text).toContain('*Si no haces nada:*')
    expect(text).toContain('1. Ubicar los campos (contador)')
    expect(text).toContain('2. Actualizar el XML (TI)')
    expect(text).toContain('*Plazo:* 1 de octubre de 2026')
    expect(text).toContain('📄 Guía completa en PDF: https://app/api/alerts/1/guia')
  })

  it('omite plazo y guía cuando no los hay', () => {
    const text = formatAlertText({ ...base, brief: { ...brief, plazo: null } })
    expect(text).not.toContain('*Plazo:*')
    expect(text).not.toContain('Guía completa')
  })

  it('nombra la fuente en ambos formatos', () => {
    for (const p of [base, { ...base, brief }]) {
      expect(formatAlertText(p)).toContain('*Fuente:* Normograma DIAN')
      expect(formatAlertText(p)).toContain('https://dian.gov.co/norma')
    }
  })

  it('cae a la fuente genérica si la norma no la trae', () => {
    const text = formatAlertText({ ...base, norm_issuer: null, norm_source: null })
    expect(text).toContain('*Fuente:* Fuente oficial')
  })

  it('mantiene el pie legal en ambos formatos', () => {
    for (const p of [base, { ...base, brief }]) {
      expect(formatAlertText(p)).toContain('no constituye asesoría jurídica')
    }
  })
})
