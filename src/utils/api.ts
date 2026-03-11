import { useToast } from '@/composables/useToast'
import { authStorage } from '@/services/authStorage'

export const apiBase = (() => {
  const envUrl = import.meta.env.VITE_BACKEND_BASE_URL || import.meta.env.VITE_N8N_BASE_URL
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl
  }
  // Strict check: fail if not configured, or warn.
  // We keep a console error to alert the developer.
  console.error('VITE_N8N_BASE_URL missing in .env')
  return ''
})()

export const isMetaLinked = () => authStorage.isMetaLinked()

export const isMetaOAuthInProgress = () => authStorage.isMetaOAuthInProgress()

const isMetaProtectedPath = (value: string) => /\/webhook\/crm\/(?:instagram|facebook|meta)(?:\/|$)/i.test(String(value || ''))

export const apiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path
  const p = path.startsWith('/') ? path : `/${path}`
  const hasDedicatedBackendBase = Boolean(import.meta.env.VITE_BACKEND_BASE_URL)
  if (!hasDedicatedBackendBase && import.meta.env.DEV && (p.startsWith('/webhook') || p.startsWith('/webhook-test'))) return p
  return `${apiBase}${p}`
}

const inflightGet = new Map<string, Promise<Response>>()

export const apiFetch = async (path: string, init?: RequestInit & { timeoutMs?: number; withAuth?: boolean; skipMetaCheck?: boolean; silent?: boolean; dedupe?: boolean }) => {
  const { showToast } = useToast()
  const options = { ...init }
  options.headers = new Headers(options.headers || {})
  // Remove credentials: 'include' if n8n causes CORS issues with it, but keeping it for now if n8n supports it
  // options.credentials = 'include' 

  // if (!skipMetaCheck) {
  //   const full = apiUrl(path)
  //   const protectedCall = isMetaProtectedPath(path) || isMetaProtectedPath(full)
  //   if (protectedCall && !isMetaLinked() && !isMetaOAuthInProgress()) {
  //     throw new Error('META_NOT_LINKED')
  //   }
  // }

  const controller = new AbortController()
  const timeoutMs = typeof (init as any)?.timeoutMs === 'number' ? Number((init as any).timeoutMs) : 20000
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  options.signal = options.signal || controller.signal

  // No CSRF for n8n webhooks usually

  const withAuth = (init as any)?.withAuth !== false
  const method = String((options as any)?.method || 'GET').toUpperCase()
  const dedupe = (init as any)?.dedupe !== false && method === 'GET' && !(options as any)?.body
  const authToken = withAuth ? (authStorage.getToken() || '') : ''
  if (withAuth && !options.headers.has('Authorization')) {
    if (authToken) options.headers.set('Authorization', `Bearer ${authToken}`)
  }

  const url = apiUrl(path)
  const key = dedupe ? `${method} ${url} auth:${authToken}` : ''
  const existing = dedupe ? inflightGet.get(key) : undefined
  if (existing) {
    return (await existing).clone()
  }

  const fetchPromise = fetch(url, options).catch((err) => {
    clearTimeout(timer)
    if (!init?.silent) {
      if (err.name === 'AbortError') {
        showToast('Richiesta scaduta (timeout)', 'error')
      } else {
        showToast('Errore di connessione', 'error')
      }
    }
    throw err
  })
  if (dedupe) inflightGet.set(key, fetchPromise)

  const res = await fetchPromise.finally(() => {
    clearTimeout(timer)
    if (dedupe) inflightGet.delete(key)
  })

  if (!res.ok && !init?.silent) {
    if (res.status === 401) {
      showToast('Sessione scaduta. Effettua nuovamente il login.', 'error')
      // Pulizia sessione e redirect al login
      authStorage.clearAll()
      if (typeof window !== 'undefined') {
        const base = import.meta.env.BASE_URL || '/'
        const loginUrl = base.endsWith('/') ? `${base}login` : `${base}/login`
        setTimeout(() => {
          window.location.href = loginUrl
        }, 1500)
      }
    } else if (res.status >= 500) {
      showToast(`Errore Server (${res.status})`, 'error')
    }
  }

  {
    const full = apiUrl(path)
    const protectedCall = isMetaProtectedPath(path) || isMetaProtectedPath(full)
    // Always try to auto-link if the call succeeds, regardless of skipMetaCheck
    if (protectedCall && res.ok) {
      const alreadyLinked = authStorage.isMetaLinked()
      // If backend says OK, we are linked. Trust the backend.
      if (!alreadyLinked) {
        authStorage.setMetaLinked(true)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('meta:linked'))
        }
      }
    }
    if (protectedCall && !res.ok) {
      try {
        const raw = await res.clone().text().catch(() => '')
        const payload = (() => {
          if (!raw) return null
          try {
            return JSON.parse(raw)
          } catch {
            return raw
          }
        })()
        if (isMetaTokenExpiredError(payload)) {
          authStorage.setMetaLinked(false)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('meta:unlinked'))
          }
        }
      } catch {}
    }
  }

  return res
}

export async function safeReadJson(res: Response): Promise<any | null> {
  try {
    const raw = await res.text().catch(() => '')
    if (!raw) return null
    const trimmed = raw.trim()
    try {
      return JSON.parse(trimmed)
    } catch {
      const startObj = trimmed.indexOf('{')
      const startArr = trimmed.indexOf('[')
      const start =
        startObj === -1 ? startArr : startArr === -1 ? startObj : Math.min(startObj, startArr)
      if (start === -1) return null
      const candidate = trimmed.slice(start)
      try {
        return JSON.parse(candidate)
      } catch {
        return null
      }
    }
  } catch {
    return null
  }
}

export function extractMetaOAuthError(payload: any): {
  status?: number
  type?: string
  code?: number
  subcode?: number
  message?: string
  fbtrace_id?: string
} | null {
  const tryParseJson = (value: any) => {
    if (typeof value !== 'string') return null
    const s = value.trim()
    if (!s) return null
    const start = s.indexOf('{')
    if (start === -1) return null
    const candidate = s.slice(start)
    try {
      return JSON.parse(candidate)
    } catch {
      return null
    }
  }

  if (!payload) return null

  const direct =
    typeof payload === 'object' && payload
      ? {
          status: typeof payload.status === 'number' ? payload.status : undefined,
          type: typeof payload.type === 'string' ? payload.type : undefined,
          code: typeof payload.code === 'number' ? payload.code : undefined,
          subcode: typeof payload.subcode === 'number' ? payload.subcode : undefined,
          message: typeof payload.message === 'string' ? payload.message : undefined,
          fbtrace_id: typeof payload.fbtrace_id === 'string' ? payload.fbtrace_id : undefined
        }
      : null

  if (direct?.code || direct?.message) return direct

  const nestedError = payload?.error ?? payload?.response?.error ?? payload?.data?.error ?? null
  if (nestedError) {
    const code = Number(nestedError?.code)
    const subcode = Number(nestedError?.error_subcode ?? nestedError?.subcode)
    return {
      status: typeof nestedError?.status === 'number' ? nestedError.status : direct?.status,
      type: typeof nestedError?.type === 'string' ? nestedError.type : direct?.type,
      code: Number.isFinite(code) ? code : undefined,
      subcode: Number.isFinite(subcode) ? subcode : undefined,
      message: typeof nestedError?.message === 'string' ? nestedError.message : undefined,
      fbtrace_id: typeof nestedError?.fbtrace_id === 'string' ? nestedError.fbtrace_id : undefined
    }
  }

  const message = payload?.error?.message ?? payload?.message ?? payload?.errorMessage ?? null
  const parsedFromMessage = tryParseJson(message)
  if (parsedFromMessage?.error) return extractMetaOAuthError(parsedFromMessage)

  const parsed = tryParseJson(payload)
  if (parsed?.error) return extractMetaOAuthError(parsed)

  return null
}

export function isMetaTokenExpiredError(payload: any): boolean {
  const err = extractMetaOAuthError(payload)
  const code = Number(err?.code)
  const subcode = Number(err?.subcode)
  const msg = String(err?.message || '')
  if (code === 190 && subcode === 463) return true
  if (code === 190 && /session has expired/i.test(msg)) return true
  if (code === 190 && /\bexpired\b/i.test(msg)) return true
  return false
}

export async function getMessages(params: { conversation_id?: string; platform?: string; contact_id?: string; page?: number; limit?: number }) {
  if ((params?.platform === 'instagram' || params?.platform === 'facebook') && !isMetaLinked()) {
    return { data: { messages: [] }, messages: [] } as any
  }
  const q = new URLSearchParams()
  if (params?.conversation_id) q.set('conversation_id', params.conversation_id)
  if (params?.platform) q.set('platform', params.platform)
  if (params?.contact_id) q.set('contact_id', params.contact_id)
  if (params?.page) q.set('page', String(params.page))
  if (params?.limit) q.set('limit', String(params.limit))
  const res = await apiFetch(`/webhook/crm/messages?${q.toString()}`)
  return res.json()
}

export async function sendWhatsApp(body: { to?: string; phone?: string; text?: string }) {
  const payload: any = { phone: String((body as any).phone || body.to || '') }
  if (body.text) payload.text = body.text
  const res = await apiFetch('/webhook/crm/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    timeoutMs: 20000
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      status: 'error',
      code: res.status,
      message: (data && (data.message || data.error)) || 'Request failed',
      payload
    }
  }
  return data
}

export async function sendInstagram(body: { to: string; text?: string; mediaUrl?: string }) {
  if (!isMetaLinked()) return { status: 'error', message: 'META_NOT_LINKED' } as any
  const payload: any = { recipient_id: String(body.to || '') }
  if (body.text) payload.text = body.text
  if (body.mediaUrl) payload.media_url = body.mediaUrl
  const res = await apiFetch('/webhook/crm/instagram/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    timeoutMs: 20000
  })
  return res.json()
}

export async function sendFacebook(body: { to?: string; recipient_id?: string; text?: string; mediaUrl?: string }) {
  if (!isMetaLinked()) return { status: 'error', message: 'META_NOT_LINKED' } as any
  const payload = { recipient_id: String((body as any).recipient_id || body.to || ''), text: body.text }
  const res = await apiFetch('/webhook/crm/facebook/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return res.json()
}

/**
 * Invia un messaggio Facebook (testo, media o entrambi) tramite endpoint unificato n8n.
 * Validazioni:
 * - recipientId obbligatorio
 * - almeno uno tra text o mediaUrl
 * Formattazione payload conforme alla specifica:
 * {
 *   recipient_id: string,
 *   text?: string,
 *   media?: { type: 'image' | 'file' | 'audio' | 'video'; url: string; is_reusable: true }
 * }
 * Restituisce la risposta JSON di n8n, es.:
 * { status: 'sent', count: 1 | 2, results: [...] }
 */
export async function sendFacebookMessage(params: {
  recipientId: string
  text?: string
  mediaUrl?: string
  mediaType?: 'image' | 'file' | 'audio' | 'video'
}) {
  try {
    if (!isMetaLinked()) return { status: 'error', message: 'META_NOT_LINKED' } as any
    const recipientId = String(params.recipientId || '').trim()
    const text = typeof params.text === 'string' ? params.text.trim() : ''
    const mediaUrl = typeof params.mediaUrl === 'string' ? params.mediaUrl.trim() : ''
    const mediaType = params.mediaType

    // Validazioni di input
    if (!recipientId) {
      throw new Error('recipientId è obbligatorio')
    }
    if (!text && !mediaUrl) {
      throw new Error('Fornire almeno text o mediaUrl')
    }
    if (mediaUrl && mediaType && !['image', 'file', 'audio', 'video'].includes(mediaType)) {
      throw new Error('mediaType non valido')
    }

    // Costruzione payload secondo specifica
    const payload: any = { recipient_id: recipientId }
    if (text) payload.text = text
    if (mediaUrl) {
      payload.media = {
        type: mediaType || 'image',
        url: mediaUrl,
        is_reusable: true
      }
    }

    // Chiamata HTTP verso l'endpoint unificato n8n
    const res = await apiFetch('/webhook/crm/facebook/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeoutMs: 20000
    })

    // Gestione risposta
    const data = await res.json().catch(() => ({}))

    // Normalizzazione minima dell'output quando l'endpoint non è attivo o torna errore
    if (!res.ok) {
      return {
        status: 'error',
        code: res.status,
        message: (data && (data.message || data.error)) || 'Request failed',
        payload
      }
    }

    // Ritorna la risposta di n8n (tipicamente { status, count, results })
    return data
  } catch (err: any) {
    return {
      status: 'error',
      message: String(err?.message || err)
    }
  }
}
