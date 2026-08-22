import { describe, it, expect } from 'vitest'
import { CHANNEL_FIELD, normalizePhone, validateChannelValue } from './channel-config'
import { CHANNEL_TYPES } from './types'
import { ADAPTERS } from './deliver/dispatch'

describe('channel config contract', () => {
  it('covers every channel type', () => {
    for (const type of CHANNEL_TYPES) expect(CHANNEL_FIELD[type]).toBeTruthy()
  })

  // The whole point of the map: what settings saves is what the adapter reads.
  it('matches the registered delivery adapters', () => {
    expect(Object.keys(ADAPTERS).sort()).toEqual([...CHANNEL_TYPES].sort())
  })
})

describe('validateChannelValue', () => {
  it('rejects an enabled channel with an empty value', () => {
    expect(validateChannelValue('slack', '  ')).toMatch(/falta completar/)
  })

  it('accepts an https webhook and rejects anything else', () => {
    expect(validateChannelValue('slack', 'https://hooks.slack.com/services/T/B/x')).toBeNull()
    expect(validateChannelValue('discord', 'no-soy-una-url')).toMatch(/no es válida/)
    expect(validateChannelValue('teams', 'http://inseguro.com/hook')).toMatch(/https/)
  })

  it('validates the email address', () => {
    expect(validateChannelValue('email', 'alertas@empresa.com')).toBeNull()
    expect(validateChannelValue('email', 'alertas-arroba-empresa')).toMatch(/correo/)
  })

  it('requires E.164 phones but tolerates how people type them', () => {
    expect(validateChannelValue('whatsapp', '+573001234567')).toBeNull()
    expect(validateChannelValue('whatsapp', '+57 300 123 4567')).toBeNull()
    expect(validateChannelValue('voice', '+57 (300) 123-4567')).toBeNull()
    // Without the country code Kapso and Retell reject the call.
    expect(validateChannelValue('voice', '3001234567')).toMatch(/formato internacional/)
  })
})

describe('normalizePhone', () => {
  it('strips spaces, dashes and parentheses', () => {
    expect(normalizePhone('+57 (300) 123-4567')).toBe('+573001234567')
  })
})
