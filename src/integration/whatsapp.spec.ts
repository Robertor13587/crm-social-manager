import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { irkRequest } from '../utils/irkGateway'

vi.mock('../agents/backendApiHelper', () => ({
  executeBackend: async () => ({ status: 'backend_raw', response: { message_id: 'msg-1', status: 'sent', phone: '+390000000000' } })
}))

describe('Flussi WhatsApp (integrazione)', () => {
  beforeEach(() => { /* noop */ })
  afterEach(() => { vi.restoreAllMocks() })

  it('invia messaggio e restituisce envelope ok', async () => {
    const r = await irkRequest('whatsapp', 'send_message', { phone: '+390000000000', text: 'ciao' })
    expect(r.status).toBe('ok')
    expect(r.channel).toBe('whatsapp')
    expect(r.action).toBe('send_message')
    expect(r.data?.status).toBe('sent')
  })
})
