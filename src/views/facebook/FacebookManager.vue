<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">Gestione Facebook</h1>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn-secondary w-full sm:w-auto" @click="refreshStats">
          <RefreshCw class="w-4 h-4 sm:mr-2" />
          <span class="hidden sm:inline">Aggiorna</span>
          <span class="sm:hidden">Aggiorna</span>
        </button>
      </div>
    </div>

    <div v-if="facebookAuthExpired" class="card border border-red-200 bg-red-50">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 class="text-lg font-semibold text-red-900">Token Facebook scaduto</h2>
          <p class="mt-1 text-sm text-red-800">Ricollega l'account Meta per rigenerare il token pagina.</p>
        </div>
        <a :href="metaOAuthHref" rel="noopener noreferrer" class="btn-primary whitespace-nowrap" @click="onFacebookOAuthClick">
          Ricollega Meta
        </a>
      </div>
    </div>

    <div v-if="facebookPage" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="card md:col-span-2">
        <div class="flex items-center gap-6">
          <div v-if="facebookPage.pictureUrl" class="w-24 h-24 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
            <img :src="facebookPage.pictureUrl" alt="Pagina" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center">
            <User class="w-10 h-10 text-slate-500" />
          </div>
          <div>
            <h2 class="text-2xl font-bold text-gray-900">{{ facebookPage.name }}</h2>
            <p class="text-sm text-gray-500">ID: {{ facebookPage.id }}</p>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="flex justify-between divide-x divide-gray-200">
          <div class="flex-1 text-center px-4">
            <div class="text-sm text-gray-600">Fan</div>
            <div class="text-xl font-semibold text-gray-900">{{ facebookPage.fanCount }}</div>
          </div>
          <div class="flex-1 text-center px-4">
            <div class="text-sm text-gray-600">Followers</div>
            <div class="text-xl font-semibold text-gray-900">{{ facebookPage.followersCount }}</div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="card">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 class="text-lg font-semibold text-slate-900">Pagina Facebook non collegata</h2>
          <p class="mt-1 text-sm text-slate-600">Collega l'account Meta per visualizzare i dati pagina e gestire i DM.</p>
        </div>
        <a
          :href="metaOAuthHref"
          rel="noopener noreferrer"
          class="btn-primary whitespace-nowrap"
          @click="onFacebookOAuthClick"
        >
          Collega account Meta
        </a>
      </div>
    </div>

    <div v-if="facebookPage && !facebookAuthExpired" class="sticky top-[72px] z-20">
      <nav class="card p-2 flex flex-wrap gap-2">
        <button
          @click="activeTab = 'dm'"
          class="px-3 py-2 rounded-xl text-sm font-semibold transition"
          :class="activeTab === 'dm'
            ? 'bg-slate-900 text-white'
            : 'text-slate-700 hover:bg-slate-900/5'"
        >
          Direct Messages
          <span v-if="dmConversations.length" class="ml-1 text-xs opacity-70">({{ dmConversations.length }})</span>
        </button>
        <button
          @click="activeTab = 'bulk'"
          class="px-3 py-2 rounded-xl text-sm font-semibold transition"
          :class="activeTab === 'bulk'
            ? 'bg-slate-900 text-white'
            : 'text-slate-700 hover:bg-slate-900/5'"
        >
          Invio massivo
          <span v-if="dmConversations.length" class="ml-1 text-xs opacity-70">({{ dmConversations.length }})</span>
        </button>
        <button
          @click="activeTab = 'followers'"
          class="px-3 py-2 rounded-xl text-sm font-semibold transition"
          :class="activeTab === 'followers'
            ? 'bg-slate-900 text-white'
            : 'text-slate-700 hover:bg-slate-900/5'"
        >
          Followers
          <span v-if="fanCount" class="ml-1 text-xs opacity-70">({{ fanCount }})</span>
        </button>
      </nav>
    </div>

    <div v-if="facebookPage && !facebookAuthExpired && activeTab === 'dm'" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1">
          <div class="card">
            <h3 class="text-lg font-semibold text-slate-900 mb-4">Conversazioni DM</h3>
            <div class="space-y-3">
              <div
                v-for="conversation in dmConversations"
                :key="conversation.id"
                @click="selectDMConversation(conversation)"
                class="p-3 rounded-2xl cursor-pointer transition-colors border"
                :class="selectedDMConversation?.id === conversation.id 
                  ? 'bg-slate-900 text-white border-slate-900' 
                  : 'hover:bg-slate-900/5 border-slate-200/70 text-slate-900'"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
                    <MessageSquare class="w-5 h-5 opacity-90" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold truncate">
                      {{ conversation.contact || conversation.id }}
                    </p>
                    <p class="text-sm opacity-75 truncate">
                      {{ conversation.last_message || '' }}
                    </p>
                    <p class="text-xs opacity-60">
                      {{ fmtDateTime(conversation.last_message_at || '') }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-2">
          <div v-if="selectedDMConversation" class="card">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
                  <MessageSquare class="w-5 h-5 opacity-90" />
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-slate-900">{{ selectedDMConversation.contact || selectedDMConversation.id }}</h3>
                  <p class="text-sm text-slate-500">{{ selectedDMConversation.psid || selectedDMConversation.contact_id }}</p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <button class="text-slate-500 hover:text-slate-900">
                  <MoreVertical class="w-5 h-5" />
                </button>
              </div>
            </div>

            <div ref="fbMsgContainer" class="mt-2 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 h-64 overflow-y-auto">
              <div class="space-y-4">
                <div v-if="dmMessages.length === 0" class="text-center text-slate-500 text-sm py-10">
                  Nessun messaggio. Inizia la conversazione!
                </div>
                <div
                  v-for="message in dmMessages"
                  :key="message.id"
                  class="flex"
                  :class="message.direction === 'outgoing' ? 'justify-end' : 'justify-start'"
                >
                  <div
                    class="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm"
                    :class="message.direction === 'outgoing' 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-white text-slate-900 border border-slate-200/70'"
                  >
                    <p class="text-sm">{{ message.content }}</p>
                    <p class="text-xs mt-1 opacity-75">{{ fmtDateTime(message.time) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="border-t border-slate-200 pt-4">
              <div class="flex items-center space-x-3">
                <button class="text-slate-500 hover:text-slate-900">
                  <Image class="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Scrivi un messaggio..."
                  class="flex-1 input-field"
                  v-model="newDMMessage"
                  @keyup.enter="sendDMMessage"
                />
                <button 
                  @click="sendDMMessage"
                  class="btn-primary"
                >
                  <Send class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div v-else class="card h-96 flex items-center justify-center">
            <div class="text-center">
              <MessageSquare class="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p class="text-gray-500">Seleziona una conversazione DM per iniziare</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="facebookPage && !facebookAuthExpired && activeTab === 'bulk'" class="space-y-6">
      <div class="card">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-900">Conversazioni DM</h2>
          <div class="flex items-center space-x-3">
            <button class="btn-secondary" @click="bulkSelectAll" :disabled="dmConversations.length === 0">Seleziona tutti</button>
            <button class="btn-secondary" @click="bulkClearSelection" :disabled="bulkSelectedCount === 0">Pulisci selezione</button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seleziona</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contatto</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ultimo messaggio</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aggiornato</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="conversation in dmConversations" :key="conversation.id">
                <td class="px-6 py-4 whitespace-nowrap">
                  <input type="checkbox" :checked="isBulkSelected(conversation.id)" @change="toggleBulkSelect(conversation.id)" />
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ conversation.contact || conversation.id }}</div>
                  <div class="text-xs text-gray-500">{{ conversation.psid || '' }}</div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 truncate max-w-md">{{ conversation.last_message || '' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ fmtDateTime(conversation.last_message_at || '') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <div class="text-sm text-gray-700">Selezionati: {{ bulkSelectedCount }} / {{ dmConversations.length }}</div>
          <div class="text-xs text-gray-500" v-if="bulkSending">{{ bulkStatus }}</div>
        </div>
        <div class="space-y-3">
          <input type="text" v-model="bulkMessage" class="input-field w-full" placeholder="Scrivi un messaggio..." />
          <div class="flex items-center space-x-3">
            <button class="btn-primary" :disabled="!canBulkSendText" @click="bulkSendText">Invia a selezionati</button>
            <div class="text-sm" :class="bulkStatusType === 'success' ? 'text-green-600' : bulkStatusType === 'error' ? 'text-red-600' : 'text-gray-600'">{{ bulkStatus }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="facebookPage && !facebookAuthExpired && activeTab === 'followers'" class="space-y-6">
      <div class="card">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-900">Followers</h2>
          <div class="flex items-center space-x-3">
            <div class="relative">
              <Search class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca followers..."
                class="input-field pl-10 w-64"
                v-model="searchFollowersQuery"
              />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-if="facebookPage" class="border border-slate-200/70 rounded-2xl p-4">
            <div class="flex items-center space-x-3 mb-3">
              <div class="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
                <User class="w-6 h-6 text-gray-500" />
              </div>
              <div class="flex-1">
                <h3 class="font-medium text-gray-900">Follower totali</h3>
                <p class="text-sm text-gray-500">{{ facebookPage.name }}</p>
              </div>
            </div>
            <p class="text-2xl font-bold text-primary-600">{{ facebookPage.followersCount }}</p>
          </div>
          <div v-else class="border border-slate-200/70 rounded-2xl p-4">
            <p class="text-sm text-gray-600">Collega la pagina per vedere le metriche.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useMetaConnection } from '@/composables/useMetaConnection'
import { usePoll } from '@/composables/usePoll'
import { apiBase, extractMetaOAuthError } from '@/utils/api'
import type { Message } from '@/types'
import { RefreshCw, Search, User, MessageSquare, MoreVertical, Image, Send } from 'lucide-vue-next'
import { useFacebookStore } from '@/stores'
import { storeToRefs } from 'pinia'

const { isConnected: metaLinked, validateConnection } = useMetaConnection()
const fbStore = useFacebookStore()

const {
  activeTab,
  conversations: dmConversations,
  selectedConversation: selectedDMConversation,
  page: facebookPage,
  authExpired: facebookAuthExpired,
  n8nConfigError,
  bulkSelectedThreadIds,
  bulkMessage,
} = storeToRefs(fbStore)

// dmMessages derived from store (keyed by selected conversation id)
const dmMessages = computed((): Message[] => {
  if (!selectedDMConversation.value) return []
  return (fbStore.messages[selectedDMConversation.value.id] ?? []) as Message[]
})

const fanCount = computed(() => facebookPage.value?.fanCount ?? 0)

const lastExpiredToastAt = ref(0)

const route = useRoute()
const { showToast, showMessageToast } = useToast()
const onFacebookOAuthClick = () => {
  try {
    localStorage.setItem('postOAuthRedirect', route.fullPath)
    localStorage.setItem('metaOAuthStartAt', String(Date.now()))
    sessionStorage.removeItem('metaLinked')
    window.dispatchEvent(new CustomEvent('meta:unlinked'))
    metaLinked.value = false
    clearFacebookData()
  } catch {}
}

const metaOAuthHref = computed(() => {
  const redirectUri = `${apiBase}/webhook/crm/instagram/oauth/callback`
  const params = new URLSearchParams({
    client_id: '690209960582658',
    redirect_uri: redirectUri,
    state: 'someRandomString',
    scope: 'pages_show_list,pages_read_engagement,pages_messaging,instagram_basic,instagram_manage_messages,instagram_manage_comments'
  })
  return `https://www.facebook.com/v24.0/dialog/oauth?${params.toString()}`
})

const fbMsgContainer = ref<HTMLElement | null>(null)
const scrollToBottom = () => nextTick(() => {
  if (fbMsgContainer.value) fbMsgContainer.value.scrollTop = fbMsgContainer.value.scrollHeight
})

const searchFollowersQuery = ref('')
const newDMMessage = ref('')
const bulkStatus = ref('')
const bulkStatusType = ref<'success' | 'error' | ''>('')
const bulkRateMs = ref(1000)
const bulkConcurrency = ref(1)
const bulkSending = ref(false)

const markFacebookExpired = (payload: any) => {
  facebookAuthExpired.value = true
  metaLinked.value = false
  try {
    sessionStorage.removeItem('metaLinked')
  } catch {}
  window.dispatchEvent(new CustomEvent('meta:unlinked'))
  facebookPage.value = null
  dmConversations.value = []
  selectedDMConversation.value = null
  const now = Date.now()
  if (now - lastExpiredToastAt.value > 60000) {
    const err = extractMetaOAuthError(payload)
    const msg = err?.message ? ` (${String(err.message).slice(0, 120)})` : ''
    showToast(`Token Facebook scaduto. Ricollega l'account Meta.${msg}`, 'warning', 7000)
    lastExpiredToastAt.value = now
  }
}

const clearFacebookExpired = () => {
  facebookAuthExpired.value = false
}

const clearFacebookData = () => {
  facebookPage.value = null
  dmConversations.value = []
  selectedDMConversation.value = null
  n8nConfigError.value = false
}

const loadFacebookPage = async () => {
  fbStore.page = null
  await fbStore.loadPage()
  if (fbStore.authExpired) {
    markFacebookExpired({})
  } else if (fbStore.page) {
    clearFacebookExpired()
  } else {
    n8nConfigError.value = true
  }
}

const fmtDateTime = (s?: string) => {
  if (!s) return ''
  try {
    const d = new Date(s)
    const date = d.toLocaleDateString('it-IT')
    const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    return `${date} ${time}`
  } catch {
    return s || ''
  }
}

const bulkSelectedCount = computed(() => bulkSelectedThreadIds.value.size)
const canBulkSendText = computed(() => !bulkSending.value && bulkSelectedThreadIds.value.size > 0 && bulkMessage.value.trim().length > 0)
const isBulkSelected = (threadId: string) => bulkSelectedThreadIds.value.has(String(threadId || ''))
const toggleBulkSelect = (threadId: string) => fbStore.toggleBulkThread(threadId)
const bulkSelectAll = () => {
  const s = new Set(fbStore.bulkSelectedThreadIds)
  dmConversations.value.forEach(c => { const id = String(c?.id || ''); if (id) s.add(id) })
  fbStore.bulkSelectedThreadIds = s
}
const bulkClearSelection = () => fbStore.clearBulkSelection()

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))
const runBulk = async (items: string[], worker: (threadId: string) => Promise<boolean>) => {
  let success = 0, failed = 0
  const total = items.length
  const queue = [...items]
  const runOne = async (threadId: string) => {
    try {
      const ok = await worker(threadId)
      if (ok) success++; else failed++
    } catch {
      failed++
    } finally {
      bulkStatus.value = `Inviati: ${success}, falliti: ${failed}, totali: ${total}`
      await delay(bulkRateMs.value)
    }
  }
  const workers: Promise<void>[] = []
  for (let i = 0; i < Math.max(1, bulkConcurrency.value); i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const id = queue.shift()!
        await runOne(id)
      }
    })())
  }
  await Promise.all(workers)
  return { success, failed, total }
}

const sendFacebookText = async (recipientId: string, text: string) => {
  try {
    const result = await fbStore.sendMessage(recipientId, text)
    return result.status === 'ok'
  } catch {
    return false
  }
}

const bulkSendText = async () => {
  if (!canBulkSendText.value) return
  bulkSending.value = true
  bulkStatusType.value = ''
  bulkStatus.value = 'Invio in corso...'
  const threadIds = Array.from(bulkSelectedThreadIds.value)
  const { success, failed } = await runBulk(threadIds, async (threadId) => {
    const conv = dmConversations.value.find(c => String(c?.id || '') === String(threadId))
    const recipient = String(conv?.psid || conv?.contact_id || conv?.contact || '').trim()
    if (!recipient) return false
    return sendFacebookText(recipient, bulkMessage.value)
  })
  bulkStatus.value = `Inviati: ${success}, falliti: ${failed}, totali: ${threadIds.length}`
  bulkStatusType.value = failed === 0 ? 'success' : 'error'
  bulkSending.value = false
}

let refreshPromise: Promise<void> | null = null
let refreshQueued = false

const doRefreshStats = async () => {
  if (!metaLinked.value) {
    stopPolling()
    clearFacebookData()
    return
  }
  await loadFacebookPage()
  if (facebookPage.value && !facebookAuthExpired.value) {
    await loadConversations()
    startPolling()
  } else {
    stopPolling()
  }
}

const refreshStats = async () => {
  if (refreshPromise) {
    refreshQueued = true
    return refreshPromise
  }
  refreshPromise = (async () => {
    do {
      refreshQueued = false
      await doRefreshStats()
    } while (refreshQueued)
  })().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

const loadConversations = async () => {
  if (!facebookPage.value || facebookAuthExpired.value) {
    fbStore.conversations = []
    selectedDMConversation.value = null
    n8nConfigError.value = false
    return
  }
  n8nConfigError.value = false
  await fbStore.loadConversations()
  if (fbStore.authExpired) {
    markFacebookExpired({})
  } else if (fbStore.errors.conversations) {
    if (dmConversations.value.length === 0) n8nConfigError.value = true
  } else {
    clearFacebookExpired()
  }
}

const loadMessages = async (threadId: string) => {
  await fbStore.loadMessages(threadId)
  if (fbStore.authExpired) {
    markFacebookExpired({})
  }
}

const selectDMConversation = (conversation: any) => {
  selectedDMConversation.value = conversation
  loadMessages(conversation.id)
}

const sendDMMessage = async () => {
  if (!newDMMessage.value.trim() || !selectedDMConversation.value) return
  const recipient = selectedDMConversation.value.psid || selectedDMConversation.value.contact_id || selectedDMConversation.value.contact
  if (!recipient) return
  try {
    const result = await fbStore.sendMessage(recipient, newDMMessage.value)
    if (result.status === 'ok') {
      clearFacebookExpired()
      newDMMessage.value = ''
      await loadMessages(selectedDMConversation.value.id)
    }
  } catch {}
}

const _fbLastConvTs = new Map<string, string>()
let _fbTsInit = false

const { start: startPolling, stop: stopPolling } = usePoll(async () => {
  if (!facebookPage.value || facebookAuthExpired.value) return
  const prevTs = new Map(_fbLastConvTs)
  const firstLoad = !_fbTsInit
  await loadConversations()
  for (const conv of dmConversations.value) {
    const t = String((conv as any).last_message_at || '')
    if (!firstLoad) {
      const prev = prevTs.get(conv.id)
      if (prev && t && t !== prev) {
        const name = (conv as any).contact || 'Utente'
        showMessageToast('facebook', name)
      }
    }
    if (t) _fbLastConvTs.set(conv.id, t)
  }
  _fbTsInit = true
}, { interval: 15000, immediate: false })

const { start: startMsgPoll, stop: stopMsgPoll } = usePoll(async () => {
  if (selectedDMConversation.value) await loadMessages(selectedDMConversation.value.id)
}, { interval: 3000, immediate: false })

watch(() => selectedDMConversation.value?.id, (id) => {
  stopMsgPoll()
  if (id) startMsgPoll()
})
watch(() => dmMessages.value.length, scrollToBottom)
watch(() => selectedDMConversation.value?.id, scrollToBottom)

watch(metaLinked, async (connected: boolean) => {
  if (connected) {
    await refreshStats()
  } else {
    stopPolling()
    clearFacebookData()
  }
})

onMounted(async () => {
  await validateConnection()
  await refreshStats()
})

onUnmounted(() => {
  stopPolling()
  stopMsgPoll()
})
</script>
