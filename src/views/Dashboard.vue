<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">Dashboard</h1>
      <div class="text-sm text-gray-500">
        Ultimo aggiornamento: {{ lastUpdate }}
      </div>
    </div>

    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <AlertCircle class="w-5 h-5 text-yellow-400" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-yellow-800">Comunicazione Meta — Revisione integrazioni social in corso</h3>
          <div class="mt-2 text-sm text-yellow-700 space-y-2">
            <p>Le integrazioni WhatsApp, Instagram e Facebook sono in fase di revisione o configurazione. Alcune funzionalità possono risultare limitate finché l'approvazione non è completa.</p>
            <ul class="list-disc list-inside">
              <li>Per WhatsApp valgono le finestre di 24h e l'uso dei template approvati.</li>
              <li>Su Instagram e Facebook l'invio dei messaggi e la sincronizzazione dei dati possono essere parziali durante la revisione.</li>
              <li>I dati mostrati in questa dashboard provengono dal database locale e saranno riallineati dopo la completa approvazione.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Meta reconnect banner (shown when token expires while user is logged in) -->
    <div v-if="needsReconnect" class="bg-orange-50 border-l-4 border-orange-400 p-4">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-3">
          <WifiOff class="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
          <div>
            <h3 class="text-sm font-medium text-orange-800">Connessione Meta scaduta</h3>
            <p class="mt-1 text-sm text-orange-700">Il token di accesso a Instagram/Facebook è scaduto. Riconnetti per aggiornare i dati social.</p>
            <a
              :href="metaOAuthHref"
              class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-orange-800 underline hover:text-orange-900"
              rel="noopener noreferrer"
              @click="onReconnectClick"
            >
              Riconnetti account Meta
            </a>
          </div>
        </div>
        <button class="shrink-0 text-orange-400 hover:text-orange-600" title="Chiudi" @click="dismissReconnect">
          <span class="sr-only">Chiudi</span>✕
        </button>
      </div>
    </div>

    <!-- Health status bar -->
    <div class="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-4 py-2">
      <span class="font-medium text-slate-700 mr-1">Stato servizi:</span>
      <template v-for="(svc, key) in healthServices" :key="key">
        <span class="flex items-center gap-1.5">
          <span :class="['w-2 h-2 rounded-full shrink-0', statusColor(svc.status)]"></span>
          {{ svc.name }} — {{ statusText(svc.status) }}
          <span v-if="svc.latencyMs !== null" class="text-slate-400">({{ svc.latencyMs }}ms)</span>
        </span>
      </template>
      <button class="ml-auto flex items-center gap-1 text-slate-400 hover:text-slate-600" :disabled="healthChecking" @click="recheckHealth" title="Aggiorna stato">
        <RefreshCw :class="['w-3 h-3', healthChecking ? 'animate-spin' : '']" />
      </button>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <DashboardCard 
        title="Messaggi Totali"
        :value="String(kpi.total_messages || 0)"
        :change="delta.total_messages"
        icon="MessageSquare"
        color="blue"
      />
      <DashboardCard 
        title="In Arrivo"
        :value="String(kpi.inbound_messages || 0)"
        :change="delta.inbound_messages"
        icon="Inbox"
        color="green"
      />
      <DashboardCard 
        title="Tempo Medio Risposta"
        :value="avgResponseTime"
        change="-12%"
        icon="Clock"
        color="purple"
      />
      <DashboardCard 
        title="Conversazioni Attive Oggi"
        :value="activeConversationsTotal"
        change="+0%"
        icon="MessageSquare"
        color="blue"
      />
    </div>

    <!-- Platform Overview -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900">WhatsApp</h2>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-6 h-6 text-green-500">
            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
          </svg>
        </div>
        <div v-if="wa.loading" class="h-24 flex items-center justify-center">
          <span class="w-3 h-3 rounded-full bg-green-500 animate-ping"></span>
        </div>
        <div v-else-if="wa.error" class="h-24 flex flex-col items-center justify-center gap-2">
          <span class="text-sm text-red-500">Errore di caricamento</span>
          <button class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700" @click="retryWa">
            <RefreshCw class="w-3 h-3" /> Riprova
          </button>
        </div>
        <div v-else-if="wa.loaded" class="space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-gray-600">Messaggi Oggi</span>
            <span class="font-semibold">{{ wa.total_messages }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600">Conversazioni Attive</span>
            <span class="font-semibold">{{ wa.active_conversations }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600">Template Inviati</span>
            <span class="font-semibold">{{ wa.message_types.template || 0 }}</span>
          </div>
        </div>
        <div v-else class="h-24 flex items-center justify-center bg-gray-50 rounded-lg">
          <span class="text-sm text-gray-500">nessun dato disponibile</span>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900">Instagram</h2>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-6 h-6 text-pink-500">
            <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334"/>
          </svg>
        </div>
        <div v-if="ig.loading" class="h-24 flex items-center justify-center">
          <span class="w-3 h-3 rounded-full bg-pink-500 animate-ping"></span>
        </div>
        <div v-else-if="ig.error" class="h-24 flex flex-col items-center justify-center gap-2">
          <span class="text-sm text-red-500">Errore di caricamento</span>
          <button class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700" @click="retryIg">
            <RefreshCw class="w-3 h-3" /> Riprova
          </button>
        </div>
        <div v-else-if="ig.loaded || igStats.loaded" class="space-y-4">
          <template v-if="ig.loaded">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">DM Oggi</span>
              <span class="font-semibold">{{ ig.total_messages }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Conversazioni Attive</span>
              <span class="font-semibold">{{ ig.active_conversations }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Template Inviati</span>
              <span class="font-semibold">{{ ig.message_types.template || 0 }}</span>
            </div>
          </template>
          <div v-if="igStats.loaded" class="pt-4 border-t border-gray-100 space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Followers</span>
              <span class="font-semibold">{{ igStats.account.followers_count }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Seguiti</span>
              <span class="font-semibold">{{ igStats.account.follows_count }}</span>
            </div>
          </div>
        </div>
        <div v-else class="h-24 flex items-center justify-center bg-gray-50 rounded-lg">
          <span class="text-sm text-gray-500">nessun dato disponibile</span>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900">Facebook</h2>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-6 h-6 text-blue-600">
            <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
          </svg>
        </div>
        <div v-if="fb.loading" class="h-24 flex items-center justify-center">
          <span class="w-3 h-3 rounded-full bg-blue-500 animate-ping"></span>
        </div>
        <div v-else-if="fb.error" class="h-24 flex flex-col items-center justify-center gap-2">
          <span class="text-sm text-red-500">Errore di caricamento</span>
          <button class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700" @click="retryFb">
            <RefreshCw class="w-3 h-3" /> Riprova
          </button>
        </div>
        <div v-else-if="fb.loaded || fbStats.loaded" class="space-y-4">
          <template v-if="fb.loaded">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Messaggi Oggi</span>
              <span class="font-semibold">{{ fb.total_messages }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Conversazioni Attive</span>
              <span class="font-semibold">{{ fb.active_conversations }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Template Inviati</span>
              <span class="font-semibold">{{ fb.message_types.template || 0 }}</span>
            </div>
          </template>
          <div v-if="fbStats.loaded" class="pt-4 border-t border-gray-100 space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Fan</span>
              <span class="font-semibold">{{ fbStats.page.fan_count }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Followers</span>
              <span class="font-semibold">{{ fbStats.page.followers_count }}</span>
            </div>
          </div>
        </div>
        <div v-else class="h-24 flex items-center justify-center bg-gray-50 rounded-lg">
          <span class="text-sm text-gray-500">nessun dato disponibile</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-vue-next'
import DashboardCard from '@/components/dashboard/DashboardCard.vue'
import { apiBase } from '@/utils/api'
import { useMetaConnection } from '@/composables/useMetaConnection'
import { useHealthCheck } from '@/composables/useHealthCheck'
import { useAuthStore, useDashboardStore } from '@/stores'

const { needsReconnect, dismissReconnect } = useMetaConnection()
const { services: healthServices, isChecking: healthChecking, checkAll: recheckHealth } = useHealthCheck()
const authStore = useAuthStore()
const dashStore = useDashboardStore()

const statusColor = (s: string) =>
  s === 'ok' ? 'bg-emerald-500' : s === 'degraded' ? 'bg-yellow-400' : s === 'down' ? 'bg-red-500' : 'bg-gray-300'
const statusText = (s: string) =>
  s === 'ok' ? 'Operativo' : s === 'degraded' ? 'Degradato' : s === 'down' ? 'Non raggiungibile' : 'Sconosciuto'

const metaOAuthHref = computed(() => {
  const redirectUri = `${apiBase}/webhook/crm/instagram/oauth/callback`
  const appId = (import.meta as any).env?.VITE_FACEBOOK_APP_ID || '690209960582658'
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state: 'dashboard_reconnect',
    scope: 'pages_show_list,pages_read_engagement,pages_messaging,instagram_basic,instagram_manage_messages,instagram_manage_comments'
  })
  return `https://www.facebook.com/v24.0/dialog/oauth?${params.toString()}`
})

const onReconnectClick = () => {
  authStore.setPostOAuthRedirect('/dashboard')
  authStore.startMetaOAuth()
}

const lastUpdate = computed(() => {
  return dashStore.lastRefresh
    ? dashStore.lastRefresh.toLocaleTimeString('it-IT')
    : new Date().toLocaleTimeString('it-IT')
})

const kpi = computed(() => dashStore.kpi)

const fmtDelta = (n: number | null) => n === null ? '+0%' : `${n >= 0 ? '+' : ''}${n}%`
const delta = computed(() => ({
  total_messages: fmtDelta(dashStore.kpiDelta.total),
  inbound_messages: fmtDelta(dashStore.kpiDelta.inbound),
  outbound_messages: fmtDelta(dashStore.kpiDelta.outbound),
}))

const avgResponseTime = computed(() => 'N/D')

// Computed wrappers adding message_types for template compatibility (always empty — field kept for UI consistency)
const wa = computed(() => ({ ...dashStore.wa, message_types: {} as Record<string, number> }))
const ig = computed(() => ({ ...dashStore.ig, message_types: {} as Record<string, number> }))
const fb = computed(() => ({ ...dashStore.fb, message_types: {} as Record<string, number> }))

const activeConversationsTotal = computed(() => {
  const total = (dashStore.wa.active_conversations || 0) + (dashStore.ig.active_conversations || 0) + (dashStore.fb.active_conversations || 0)
  return String(total)
})

const igStats = computed(() => ({
  loaded: !!dashStore.socialStats.ig,
  account: {
    followers_count: dashStore.socialStats.ig?.followersCount ?? 0,
    follows_count: dashStore.socialStats.ig?.followsCount ?? 0,
  },
}))

const fbStats = computed(() => ({
  loaded: !!dashStore.socialStats.fb,
  page: {
    fan_count: dashStore.socialStats.fb?.fanCount ?? 0,
    followers_count: dashStore.socialStats.fb?.followersCount ?? 0,
  },
}))

const retryWa = () => dashStore.loadWaStats()
const retryIg = () => dashStore.loadIgStats()
const retryFb = () => dashStore.loadFbStats()

let timer: number | null = null
const onMetaChange = () => { void dashStore.loadAll() }

onMounted(async () => {
  await dashStore.loadAll()
  timer = window.setInterval(() => { void dashStore.loadAll() }, 5 * 60 * 1000)
  window.addEventListener('meta:linked', onMetaChange)
  window.addEventListener('meta:unlinked', onMetaChange)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
  window.removeEventListener('meta:linked', onMetaChange)
  window.removeEventListener('meta:unlinked', onMetaChange)
})
</script>
