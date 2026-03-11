import { describe, it, expect, vi } from 'vitest'
import { routeRequest } from './projectManager'

vi.mock('../agents/databaseAgent', () => ({
  validateMessage: (p: any) => ({ valid: true, data: p }),
  validateContact: (p: any) => ({ valid: true, data: p }),
}))
vi.mock('../agents/messagingConnector', () => ({
  handleWhatsApp: async (action: string, payload: any) => ({ ok: true, action, payload })
}))

describe('ProjectManager', () => {
  it('rifiuta canale sconosciuto', async () => {
    const r = await routeRequest({ source: 'irk.frontend', channel: 'facebook' as any, action: 'send_message', payload: {} })
    expect(r.status === 'error' || r.code === 'BAD_REQUEST').toBe(true)
  })
  it('instrada send_message su WhatsApp', async () => {
    const r = await routeRequest({ source: 'irk.frontend', channel: 'whatsapp', action: 'send_message', payload: { phone: '+39', text: 'ciao' } })
    expect(r.status).toBe('ok')
    expect(r.action).toBe('send_message')
    expect(r.channel).toBe('whatsapp')
  })
  it('list_contacts su WhatsApp', async () => {
    const r = await routeRequest({ source: 'irk.frontend', channel: 'whatsapp', action: 'list_contacts', payload: {} })
    expect(r.status).toBe('ok')
    expect(r.action).toBe('list_contacts')
  })
})

