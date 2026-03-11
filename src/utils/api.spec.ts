import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as api from './api'

describe('apiFetch', () => {
  const originalFetch = globalThis.fetch
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })
  afterEach(() => {
    globalThis.fetch = originalFetch as any
    vi.restoreAllMocks()
  })

  it('aggiunge Authorization se presente token', async () => {
    localStorage.setItem('jwt_token', 'abc123')
    const mock = vi.fn(async (url: any, init: any) => {
      expect(init.headers.get('Authorization')).toBe('Bearer abc123')
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    globalThis.fetch = mock as any
    const res = await api.apiFetch('/ping')
    expect(res.status).toBe(200)
    expect(mock).toHaveBeenCalled()
  })

  it('non modifica lo storage su 401', async () => {
    localStorage.setItem('jwt_token', 'abc123')
    const mock = vi.fn(async () => new Response('{}', { status: 401 }))
    globalThis.fetch = mock as any
    const res = await api.apiFetch('/secure')
    expect(res.status).toBe(401)
    expect(localStorage.getItem('jwt_token')).toBe('abc123')
  })

  it('usa AbortController e passa signal a fetch', async () => {
    const mock = vi.fn(async (url: any, init: any) => {
      const signal = init.signal as AbortSignal
      expect(signal).toBeDefined()
      return new Response('{}', { status: 200 })
    })
    globalThis.fetch = mock as any
    const res = await api.apiFetch('/ok')
    expect(res.status).toBe(200)
    expect(mock).toHaveBeenCalled()
  })

  it('su chiamata Meta protetta ok aggiorna metaLinked e pulisce metaOAuthStartAt', async () => {
    localStorage.setItem('jwt_token', 'abc123')
    localStorage.setItem('metaOAuthStartAt', String(Date.now() - 1000))
    sessionStorage.removeItem('metaLinked')

    const onLinked = vi.fn()
    window.addEventListener('meta:linked', onLinked as any)

    const mock = vi.fn(async (url: any, init: any) => {
      expect(String(url)).toContain('/webhook/crm/meta/profile')
      expect(init.headers.get('Authorization')).toBe('Bearer abc123')
      return new Response('{}', { status: 200 })
    })
    globalThis.fetch = mock as any

    const res = await api.apiFetch('/webhook/crm/meta/profile')
    expect(res.status).toBe(200)
    expect(sessionStorage.getItem('metaLinked')).toBe('1')
    expect(localStorage.getItem('metaOAuthStartAt')).toBe(null)
    expect(onLinked).toHaveBeenCalled()

    window.removeEventListener('meta:linked', onLinked as any)
  })
})

describe('safeReadJson', () => {
  it('parsa JSON anche con whitespace', async () => {
    const res = new Response(' \n\t{"ok":true}\n', { status: 200 })
    const j = await api.safeReadJson(res)
    expect(j).toEqual({ ok: true })
  })

  it('parsa JSON anche con prefisso non-JSON', async () => {
    const res = new Response("OK\n{\"data\":{\"id\":\"1\"}}", { status: 200 })
    const j = await api.safeReadJson(res)
    expect(j).toEqual({ data: { id: '1' } })
  })
})
