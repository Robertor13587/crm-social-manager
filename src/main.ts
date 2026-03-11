import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/main.css'

// ── Service Worker: rimozione cache vecchia al primo avvio produzione ─────────
;(async () => {
  try {
    if (!import.meta.env.PROD) return
    const key = 'sw_purge_v4'
    if (localStorage.getItem(key)) return
    if (!('serviceWorker' in navigator)) return
    localStorage.setItem(key, '1')

    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister().catch(() => false)))
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }

    location.reload()
  } catch {}
})()

const app = createApp(App)

// ── Global Vue error handler ──────────────────────────────────────────────────
app.config.errorHandler = (err, instance, info) => {
  // In produzione evita di mostrare stack trace all'utente
  if (import.meta.env.DEV) {
    console.error('[Vue] Errore globale non gestito:', err)
    console.error('[Vue] Contesto:', info)
    console.error('[Vue] Istanza:', instance)
  } else {
    // In produzione logga solo il messaggio essenziale
    // Integra qui Sentry o altro error tracker se disponibile:
    // Sentry.captureException(err, { extra: { info } })
    console.error('[Vue] Errore:', err instanceof Error ? err.message : String(err))
  }
}

// ── Global unhandled promise rejection handler ────────────────────────────────
window.addEventListener('unhandledrejection', (event) => {
  if (import.meta.env.DEV) {
    console.error('[Promise] Rejection non gestita:', event.reason)
  }
  // Previene il log di default del browser in produzione
  event.preventDefault()
})

const pinia = createPinia()
app.use(pinia)
app.use(router)

// Inizializza il listener Supabase Auth: mantiene il token in authStorage
// sincronizzato con i refresh automatici di Supabase (token scadenza 1h)
import('@/stores').then(({ useAuthStore }) => {
  useAuthStore(pinia).initAuthListener()
})

app.mount('#app')
