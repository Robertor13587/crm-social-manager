import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeBackend } from './backendApiHelper'

describe('BackendAPIHelper', () => {
  const originalFetch = globalThis.fetch
  beforeEach(() => { /* noop */ })
  afterEach(() => { globalThis.fetch = originalFetch as any; vi.restoreAllMocks() })

  it('costruisce URL relativo sulla base VITE_N8N_BASE_URL', async () => {
    const mock = vi.fn(async (url: any) => {
      expect(String(url)).toMatch(/^(?:https?:\/\/.*)?\/webhook\/crm\/whatsapp\/send$/)
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    globalThis.fetch = mock as any
    const r = await executeBackend({ method: 'POST', url: '/webhook/crm/whatsapp/send', body: { phone: '+39', text: 'ciao' } })
    expect(r.status).toBe('backend_raw')
  })

  it('accetta URL assoluti senza alterazioni', async () => {
    const url = 'https://workflow.robdev.website/webhook/crm/whatsapp/contacts'
    const mock = vi.fn(async (u: any) => {
      expect(String(u)).toBe(url)
      return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    globalThis.fetch = mock as any
    const r = await executeBackend({ method: 'GET', url })
    expect(r.status).toBe('backend_raw')
    expect(Array.isArray(r.response.items) || Array.isArray(r.response)).toBe(true)
  })
})
