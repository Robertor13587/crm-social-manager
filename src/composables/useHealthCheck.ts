import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { getFbPage } from '@/services/metaApiService'

export type ServiceStatus = 'ok' | 'degraded' | 'down' | 'unknown'

export interface ServiceHealth {
  name: string
  status: ServiceStatus
  latencyMs: number | null
  checkedAt: string | null
  message?: string
}

const POLL_INTERVAL_MS = 60_000 // 1 minute

const services = reactive<Record<string, ServiceHealth>>({
  supabase: { name: 'Supabase', status: 'unknown', latencyMs: null, checkedAt: null },
  whatsapp: { name: 'WhatsApp', status: 'unknown', latencyMs: null, checkedAt: null },
  meta: { name: 'Meta (IG/FB)', status: 'unknown', latencyMs: null, checkedAt: null },
})

const isChecking = ref(false)
let _timer: number | null = null
let _initialized = false

async function probe(fn: () => Promise<void>): Promise<{ ok: boolean; latencyMs: number; message?: string }> {
  const t0 = Date.now()
  try {
    await fn()
    return { ok: true, latencyMs: Date.now() - t0 }
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - t0, message: e?.message || 'timeout' }
  }
}

async function checkSupabase(): Promise<void> {
  const result = await probe(async () => {
    const { error } = await supabase
      .from('settings')
      .select('*', { count: 'exact', head: true })
    if (error) throw new Error(error.message)
  })
  services.supabase.status = result.ok ? 'ok' : 'down'
  services.supabase.latencyMs = result.latencyMs
  services.supabase.checkedAt = new Date().toISOString()
  if (result.message) services.supabase.message = result.message
  else delete services.supabase.message
}

async function checkWhatsApp(): Promise<void> {
  const result = await probe(async () => {
    const { error } = await supabase
      .from('wa_messages')
      .select('*', { count: 'exact', head: true })
    if (error) throw new Error(error.message)
  })
  services.whatsapp.status = result.ok ? 'ok' : 'degraded'
  services.whatsapp.latencyMs = result.latencyMs
  services.whatsapp.checkedAt = new Date().toISOString()
  if (result.message) services.whatsapp.message = result.message
  else delete services.whatsapp.message
}

async function checkMeta(): Promise<void> {
  const result = await probe(async () => {
    await getFbPage()
  })
  services.meta.status = result.ok ? 'ok' : 'degraded'
  services.meta.latencyMs = result.latencyMs
  services.meta.checkedAt = new Date().toISOString()
  if (result.message) services.meta.message = result.message
  else delete services.meta.message
}

async function checkAll(): Promise<void> {
  if (isChecking.value) return
  isChecking.value = true
  try {
    await Promise.allSettled([checkSupabase(), checkWhatsApp(), checkMeta()])
  } finally {
    isChecking.value = false
  }
}

export function useHealthCheck() {
  onMounted(() => {
    if (!_initialized) {
      _initialized = true
      void checkAll()
      _timer = window.setInterval(() => { void checkAll() }, POLL_INTERVAL_MS)
    }
  })

  onUnmounted(() => {
    if (_timer) {
      window.clearInterval(_timer)
      _timer = null
      _initialized = false
    }
  })

  return {
    services,
    isChecking,
    checkAll,
  }
}
