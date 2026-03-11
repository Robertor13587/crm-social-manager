import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function createPoolMock() {
  const pool = {
    query: vi.fn(async (sql: any) => {
      const q = String(sql || '')

      if (q.includes('SHOW COLUMNS FROM `wa_messages` LIKE')) {
        return [[{ Field: 'contact_phone' }], []] as any
      }

      if (q.includes('SELECT MAX(`timestamp`) AS last_incoming_ts')) {
        return [[{ last_incoming_ts: new Date(Date.now() - 60 * 60 * 1000).toISOString() }], []] as any
      }

      if (q.includes('INSERT INTO wa_contacts')) {
        return [{ affectedRows: 1, insertId: 123 }, []] as any
      }

      if (q.includes('SELECT id') && q.includes('FROM wa_contacts') && q.includes('REPLACE(phone')) {
        return [[{ id: 123 }], []] as any
      }

      if (q.includes('INSERT INTO wa_messages')) {
        return [{ affectedRows: 1, insertId: 77 }, []] as any
      }

      if (q.includes('FROM wa_contacts')) {
        return [[
          {
            id: 1,
            name: 'Mario Rossi',
            phone: '+393331112223',
            tags: 'vip,lead',
            note: 'nota',
            created_at: '2026-01-01T10:00:00Z',
          },
        ], []] as any
      }

      if (q.includes('SELECT COUNT(*) AS total')) {
        return [[{ total: 1 }], []] as any
      }

      if (q.includes('WITH conv AS')) {
        return [[
          {
            contact_phone: '+393331112223',
            wa_id: 'wa-1',
            from_phone: '+393331112223',
            to_phone: '+390000000000',
            direction: 'incoming',
            last_message: 'ciao',
            last_timestamp: '2026-01-01T10:05:00Z',
          },
        ], []] as any
      }

      if (q.includes('FROM wa_messages')) {
        return [[
          {
            id: 10,
            wa_id: 'wa-1',
            from_phone: '+393331112223',
            to_phone: '+390000000000',
            direction: 'incoming',
            message: 'ciao',
            timestamp: '2026-01-01T10:05:00Z',
            status: 'delivered',
            contact_phone: '+393331112223',
          },
        ], []] as any
      }

      return [[], []] as any
    }),
  }
  return pool
}

async function closeServer(server: any) {
  await new Promise<void>((resolve) => server.close(() => resolve()))
}

describe('crm_api_server', () => {
  const oldEnv = process.env

  beforeEach(() => {
    process.env = {
      ...oldEnv,
      DB_HOST: '127.0.0.1',
      DB_USER: 'root',
      DB_PASSWORD: 'test',
      DB_NAME: 'crm_social',
      FRONTEND_ORIGIN: 'http://localhost:5173',
      N8N_BASE_URL: 'https://workflow.robdev.website',
      WHATSAPP_PHONE_NUMBER_ID: '123',
      WHATSAPP_ACCESS_TOKEN: 'token',
      PORT: '0',
    }
  })

  afterEach(() => {
    process.env = oldEnv
    vi.restoreAllMocks()
  })

  it('risponde a /health con CORS', async () => {
    const pool = createPoolMock()
    vi.resetModules()
    vi.doMock('mysql2/promise', () => ({ default: { createPool: () => pool } }))
    const { startCrmApiServer } = await import('./crm_api_server.js')

    const { server, port } = await startCrmApiServer({ port: 0 })
    try {
      const res = await fetch(`http://localhost:${port}/health`, { headers: { Origin: 'http://localhost:5173' } as any })
      expect(res.status).toBe(200)
      expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
      const payload = await res.json()
      expect(payload.status).toBe('ok')
      expect(payload.db?.configured).toBe(true)
      expect(payload.db?.ok).toBe(true)
    } finally {
      await closeServer(server)
    }
  })

  it('espone endpoint WhatsApp locali', async () => {
    const pool = createPoolMock()
    vi.resetModules()
    vi.doMock('mysql2/promise', () => ({ default: { createPool: () => pool } }))
    const { startCrmApiServer } = await import('./crm_api_server.js')

    const { server, port } = await startCrmApiServer({ port: 0 })
    try {
      const base = `http://localhost:${port}`

      const contactsRes = await fetch(`${base}/webhook/crm/whatsapp/contacts`, { headers: { Origin: 'http://localhost:5173' } as any })
      expect(contactsRes.status).toBe(200)
      const contacts = await contactsRes.json()
      expect(contacts.status).toBe('ok')
      expect(Array.isArray(contacts.items)).toBe(true)
      expect(contacts.items[0]?.phone_e164).toBe('+393331112223')
      expect(Array.isArray(contacts.items[0]?.tags)).toBe(true)

      const convRes = await fetch(`${base}/webhook/crm/whatsapp/conversations?limit=20&offset=0`, { headers: { Origin: 'http://localhost:5173' } as any })
      expect(convRes.status).toBe(200)
      const conv = await convRes.json()
      expect(conv.status).toBe('ok')
      expect(conv.total).toBe(1)
      expect(Array.isArray(conv.data)).toBe(true)
      expect(conv.data[0]?.contact_phone).toBe('+393331112223')

      const msgsRes = await fetch(`${base}/webhook/crm/whatsapp/messages?phone=%2B393331112223&limit=200&offset=0`, { headers: { Origin: 'http://localhost:5173' } as any })
      expect(msgsRes.status).toBe(200)
      const msgs = await msgsRes.json()
      expect(msgs.status).toBe('ok')
      expect(typeof msgs.count).toBe('number')
      expect(Array.isArray(msgs.messages)).toBe(true)
      expect(msgs.messages[0]?.message).toBe('ciao')
    } finally {
      await closeServer(server)
    }
  })

  it('crea contatto WhatsApp via endpoint locale', async () => {
    const pool = createPoolMock()
    vi.resetModules()
    vi.doMock('mysql2/promise', () => ({ default: { createPool: () => pool } }))
    const { startCrmApiServer } = await import('./crm_api_server.js')

    const { server, port } = await startCrmApiServer({ port: 0 })
    try {
      const res = await fetch(`http://localhost:${port}/webhook/crm/whatsapp/contact/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' } as any,
        body: JSON.stringify({ name: 'Mario', phone: '+393331112223', tags: ['vip'], note: 'ok' }),
      })
      expect(res.status).toBe(200)
      const payload = await res.json()
      expect(payload.status).toBe('ok')
      expect(payload.data?.id).toBe(123)
      expect(payload.data?.action).toBeTruthy()
    } finally {
      await closeServer(server)
    }
  })

  it('invia messaggio WhatsApp via endpoint locale (mock Graph)', async () => {
    const pool = createPoolMock()
    vi.resetModules()
    vi.doMock('mysql2/promise', () => ({ default: { createPool: () => pool } }))
    const { startCrmApiServer } = await import('./crm_api_server.js')

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : String(input?.url || '')
      if (url.includes('graph.facebook.com')) {
        return new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return originalFetch(input, init)
    }) as any

    const { server, port } = await startCrmApiServer({ port: 0 })
    try {
      const res = await fetch(`http://localhost:${port}/webhook/crm/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' } as any,
        body: JSON.stringify({ phone: '+393331112223', text: 'ciao' }),
      })
      expect(res.status).toBe(200)
      const payload = await res.json()
      expect(payload.status).toBe('ok')
      expect(payload.data?.message_id).toBe('wamid.1')
      expect(payload.data?.status).toBe('sent')
    } finally {
      globalThis.fetch = originalFetch
      await closeServer(server)
    }
  })

  it('invia media WhatsApp via endpoint locale (mock Graph)', async () => {
    const pool = createPoolMock()
    vi.resetModules()
    vi.doMock('mysql2/promise', () => ({ default: { createPool: () => pool } }))
    const { startCrmApiServer } = await import('./crm_api_server.js')

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : String(input?.url || '')
      if (url.includes('graph.facebook.com')) {
        return new Response(JSON.stringify({ messages: [{ id: 'wamid.media' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return originalFetch(input, init)
    }) as any

    const { server, port } = await startCrmApiServer({ port: 0 })
    try {
      const res = await fetch(`http://localhost:${port}/webhook/crm/whatsapp/send-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' } as any,
        body: JSON.stringify({ phone: '+393331112223', type: 'image', media_url: 'https://example.com/a.jpg', caption: 'ciao' }),
      })
      expect(res.status).toBe(200)
      const payload = await res.json()
      expect(payload.status).toBe('ok')
      expect(payload.data?.message_id).toBe('wamid.media')
    } finally {
      globalThis.fetch = originalFetch
      await closeServer(server)
    }
  })

  it('invia template WhatsApp (content/variables) via endpoint locale (mock Graph)', async () => {
    const pool = createPoolMock()
    vi.resetModules()
    vi.doMock('mysql2/promise', () => ({ default: { createPool: () => pool } }))
    const { startCrmApiServer } = await import('./crm_api_server.js')

    const originalFetch = globalThis.fetch
    let lastGraphBody: any = null
    globalThis.fetch = (async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : String(input?.url || '')
      if (url.includes('graph.facebook.com')) {
        lastGraphBody = init?.body ? JSON.parse(String(init.body)) : null
        return new Response(JSON.stringify({ messages: [{ id: 'wamid.tpltext' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return originalFetch(input, init)
    }) as any

    const { server, port } = await startCrmApiServer({ port: 0 })
    try {
      const res = await fetch(`http://localhost:${port}/webhook/crm/whatsapp/send-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' } as any,
        body: JSON.stringify({ phone: '+393331112223', content: 'Ciao {{nome}}', variables: { nome: 'Mario' } }),
      })
      expect(res.status).toBe(200)
      const payload = await res.json()
      expect(payload.status).toBe('ok')
      expect(payload.data?.message_id).toBe('wamid.tpltext')
      expect(lastGraphBody?.type).toBe('text')
      expect(lastGraphBody?.text?.body).toBe('Ciao Mario')
    } finally {
      globalThis.fetch = originalFetch
      await closeServer(server)
    }
  })

  it('invia template WhatsApp (template_name) via endpoint locale (mock Graph)', async () => {
    const pool = createPoolMock()
    vi.resetModules()
    vi.doMock('mysql2/promise', () => ({ default: { createPool: () => pool } }))
    const { startCrmApiServer } = await import('./crm_api_server.js')

    const originalFetch = globalThis.fetch
    let lastGraphBody: any = null
    globalThis.fetch = (async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : String(input?.url || '')
      if (url.includes('graph.facebook.com')) {
        lastGraphBody = init?.body ? JSON.parse(String(init.body)) : null
        return new Response(JSON.stringify({ messages: [{ id: 'wamid.tpl' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return originalFetch(input, init)
    }) as any

    const { server, port } = await startCrmApiServer({ port: 0 })
    try {
      const res = await fetch(`http://localhost:${port}/webhook/crm/whatsapp/send-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' } as any,
        body: JSON.stringify({ phone: '+393331112223', template_name: 'hello_world', language_code: 'it', body_params: ['Mario'] }),
      })
      expect(res.status).toBe(200)
      const payload = await res.json()
      expect(payload.status).toBe('ok')
      expect(payload.data?.message_id).toBe('wamid.tpl')
      expect(lastGraphBody?.type).toBe('template')
      expect(lastGraphBody?.template?.name).toBe('hello_world')
    } finally {
      globalThis.fetch = originalFetch
      await closeServer(server)
    }
  })

  it('calcola can-send-text via endpoint locale', async () => {
    const pool = createPoolMock()
    vi.resetModules()
    vi.doMock('mysql2/promise', () => ({ default: { createPool: () => pool } }))
    const { startCrmApiServer } = await import('./crm_api_server.js')

    const { server, port } = await startCrmApiServer({ port: 0 })
    try {
      const res = await fetch(`http://localhost:${port}/webhook/crm/whatsapp/can-send-text?phone=%2B393331112223`, {
        headers: { Origin: 'http://localhost:5173' } as any,
      })
      expect(res.status).toBe(200)
      const payload = await res.json()
      expect(payload.status).toBe('ok')
      expect(payload.data?.can_send_text).toBe(true)
    } finally {
      await closeServer(server)
    }
  })

  it('cacha risposte proxy per endpoint Meta', async () => {
    const pool = createPoolMock()
    vi.resetModules()
    vi.doMock('mysql2/promise', () => ({ default: { createPool: () => pool } }))
    const { startCrmApiServer } = await import('./crm_api_server.js')

    const originalFetch = globalThis.fetch
    let n8nCalls = 0
    globalThis.fetch = (async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : String(input?.url || '')
      if (url.startsWith('https://workflow.robdev.website/webhook/crm/meta/profile')) {
        n8nCalls += 1
        return new Response(JSON.stringify({ status: 'ok', data: { facebook: { page: { id: '1', name: 'Test' } } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return originalFetch(input, init)
    }) as any

    const { server, port } = await startCrmApiServer({ port: 0 })
    try {
      const base = `http://localhost:${port}`
      const r1 = await fetch(`${base}/webhook/crm/meta/profile`, { headers: { Origin: 'http://localhost:5173' } as any })
      expect(r1.status).toBe(200)
      expect(r1.headers.get('x-proxy-cache')).toBe('MISS')
      await r1.json()

      const r2 = await fetch(`${base}/webhook/crm/meta/profile`, { headers: { Origin: 'http://localhost:5173' } as any })
      expect(r2.status).toBe(200)
      expect(r2.headers.get('x-proxy-cache')).toBe('HIT')
      await r2.json()

      expect(n8nCalls).toBe(1)
    } finally {
      globalThis.fetch = originalFetch
      await closeServer(server)
    }
  })

  it('applica rate limiting sul proxy', async () => {
    const pool = createPoolMock()
    process.env.PROXY_RATE_RPS = '1'
    process.env.PROXY_RATE_BURST = '1'
    process.env.PROXY_RATE_ENABLE = 'true'
    vi.resetModules()
    vi.doMock('mysql2/promise', () => ({ default: { createPool: () => pool } }))
    const { startCrmApiServer } = await import('./crm_api_server.js')

    const originalFetch = globalThis.fetch
    let n8nCalls = 0
    globalThis.fetch = (async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : String(input?.url || '')
      if (url.startsWith('https://workflow.robdev.website/webhook/crm/meta/ratelimit-test')) {
        n8nCalls += 1
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return originalFetch(input, init)
    }) as any

    const { server, port } = await startCrmApiServer({ port: 0 })
    try {
      const base = `http://localhost:${port}`
      const r1 = await fetch(`${base}/webhook/crm/meta/ratelimit-test`, { headers: { Origin: 'http://localhost:5173' } as any })
      expect(r1.status).toBe(200)
      await r1.json()

      const r2 = await fetch(`${base}/webhook/crm/meta/ratelimit-test`, { headers: { Origin: 'http://localhost:5173' } as any })
      expect(r2.status).toBe(429)
      const j2 = await r2.json().catch(() => ({}))
      expect(j2?.error?.code).toBe('RATE_LIMITED')
      expect(r2.headers.get('retry-after')).toBe('1')

      expect(n8nCalls).toBe(1)
    } finally {
      globalThis.fetch = originalFetch
      await closeServer(server)
    }
  })

  it('applica circuit breaker quando n8n fallisce ripetutamente', async () => {
    const pool = createPoolMock()
    vi.resetModules()
    vi.doMock('mysql2/promise', () => ({ default: { createPool: () => pool } }))
    const { startCrmApiServer } = await import('./crm_api_server.js')

    const originalFetch = globalThis.fetch
    let n8nCalls = 0
    globalThis.fetch = (async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : String(input?.url || '')
      if (url.startsWith('https://workflow.robdev.website/webhook/crm/facebook/stats')) {
        n8nCalls += 1
        return new Response(JSON.stringify({ status: 'error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
      }
      return originalFetch(input, init)
    }) as any

    const { server, port } = await startCrmApiServer({ port: 0 })
    try {
      const base = `http://localhost:${port}`
      for (let i = 0; i < 5; i += 1) {
        const r = await fetch(`${base}/webhook/crm/facebook/stats`, { headers: { Origin: 'http://localhost:5173' } as any })
        expect(r.status).toBe(500)
        await r.text()
      }

      const r6 = await fetch(`${base}/webhook/crm/facebook/stats`, { headers: { Origin: 'http://localhost:5173' } as any })
      expect(r6.status).toBe(503)
      const payload = await r6.json().catch(() => ({}))
      expect(payload?.error?.code).toBe('N8N_UNAVAILABLE')
      expect(n8nCalls).toBe(5)
    } finally {
      globalThis.fetch = originalFetch
      await closeServer(server)
    }
  })
})
