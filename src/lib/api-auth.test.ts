import { describe, it, expect, beforeAll } from 'vitest'
import { signLink, verifyLink } from './api-auth'

const ID = 'f334f8b6-a5b8-4d8d-8ede-94cf6465aad9'

beforeAll(() => { process.env.CRON_SECRET = 'secreto-de-prueba' })

describe('enlaces firmados', () => {
  it('valida el que generamos', () => {
    expect(verifyLink('guia', ID, signLink('guia', ID))).toBe(true)
  })

  it('rechaza firma ausente o corrupta', () => {
    expect(verifyLink('guia', ID, null)).toBe(false)
    expect(verifyLink('guia', ID, 'xxx')).toBe(false)
  })

  // Sin separar por propósito, la firma del TwiML abriría también el PDF.
  it('no sirve la firma de otro propósito ni la de otra alerta', () => {
    expect(verifyLink('guia', ID, signLink('twiml', ID))).toBe(false)
    expect(verifyLink('guia', 'otra-alerta', signLink('guia', ID))).toBe(false)
  })
})
