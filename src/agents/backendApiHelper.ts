import type { BackendRequest, BackendRawResponse } from './types'
import { authStorage } from '@/services/authStorage'

const PRIMARY_BASE = (
  (import.meta as any).env?.VITE_BACKEND_BASE_URL ||
  (import.meta as any).env?.VITE_N8N_BASE_URL ||
  ''
).replace(/\/$/, '')
const REQUEST_TIMEOUT_MS = Number((import.meta as any).env?.VITE_REQUEST_TIMEOUT_MS || 15000)

function buildUrl(base: string, url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}

export async function executeBackend(req: BackendRequest): Promise<BackendRawResponse> {
  const controller1 = new AbortController()
  const timer1 = setTimeout(() => controller1.abort(), REQUEST_TIMEOUT_MS)
  try {
    const isAbsolute = /^https?:\/\//i.test(req.url)
    const relative = req.url.startsWith('/') ? req.url : `/${req.url}`
    const hasDedicatedBackendBase = Boolean((import.meta as any).env?.VITE_BACKEND_BASE_URL)
    const url =
      !hasDedicatedBackendBase &&
      !isAbsolute &&
      (import.meta as any).env?.DEV &&
      (relative.startsWith('/webhook') || relative.startsWith('/webhook-test'))
        ? relative
        : buildUrl(PRIMARY_BASE, req.url)

    const headers = new Headers({ ...(req.headers || {}) } as any)
    if (req.body !== undefined && req.body !== null && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    const token = authStorage.getToken()
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
    const res = await fetch(url, {
      method: req.method,
      headers,
      body: req.body ? JSON.stringify(req.body) : undefined,
      signal: controller1.signal,
    })
    const isJson = (res.headers.get('content-type') || '').includes('application/json')
    const payload = isJson ? await res.json() : await res.text()
    if (!res.ok) throw new Error(typeof payload === 'string' ? payload : payload?.message || 'Backend error')
    return { status: 'backend_raw', response: payload }
  } finally {
    clearTimeout(timer1)
  }
}
