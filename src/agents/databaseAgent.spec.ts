import { describe, it, expect } from 'vitest'
import { validateContact, validateMessage } from './databaseAgent'

describe('DatabaseAgent', () => {
  it('valida contatto e normalizza telefono', () => {
    const r = validateContact({ name: 'Mario', phone: '339-123 4567', tags: ['Clienti'] })
    expect(r.valid).toBe(true)
    expect(r.data?.phone).toMatch(/^\+\d+$/)
    expect(r.data?.name).toBe('Mario')
  })
  it('rifiuta contatto senza telefono', () => {
    const r = validateContact({ name: 'Mario' })
    expect(r.valid).toBe(false)
  })
  it('valida messaggio testo', () => {
    const r = validateMessage({ phone: '+393391234567', text: 'ciao' })
    expect(r.valid).toBe(true)
    expect(r.data?.text).toBe('ciao')
  })
  it('richiede text o templateId', () => {
    const r = validateMessage({ phone: '+393391234567' })
    expect(r.valid).toBe(false)
  })
})

