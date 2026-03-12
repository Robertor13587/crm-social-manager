<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">Gestione Instagram</h1>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn-secondary w-full sm:w-auto" @click="refreshAll">
          <RefreshCw class="w-4 h-4 sm:mr-2" />
          <span class="hidden sm:inline">Aggiorna</span>
          <span class="sm:hidden">Aggiorna</span>
        </button>
      </div>
    </div>

    <div v-if="instagramProfile" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="card md:col-span-2">
        <div class="flex items-center gap-6">
          <img
            v-if="instagramProfile.profilePictureUrl"
            :src="instagramProfile.profilePictureUrl"
            alt="Profilo"
            class="w-24 h-24 rounded-full object-cover"
          />
          <div v-else class="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center">
            <Instagram class="w-10 h-10 text-slate-500" />
          </div>
          <div>
            <h2 class="text-2xl font-bold text-gray-900">{{ instagramProfile.name }}</h2>
            <p class="text-sm text-gray-500">@{{ instagramProfile.username }}</p>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="flex justify-between divide-x divide-gray-200">
          <div class="flex-1 text-center px-4">
            <div class="text-sm text-gray-600">Follower</div>
            <div class="text-xl font-semibold text-gray-900">{{ instagramProfile.followersCount }}</div>
          </div>
          <div class="flex-1 text-center px-4">
            <div class="text-sm text-gray-600">Following</div>
            <div class="text-xl font-semibold text-gray-900">{{ instagramProfile.followsCount }}</div>
          </div>
          <div class="flex-1 text-center px-4">
            <div class="text-sm text-gray-600">Post</div>
            <div class="text-xl font-semibold text-gray-900">{{ instagramProfile.mediaCount }}</div>
          </div>
        </div>
      </div>
      <div class="card md:col-span-3">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Biografia</h3>
        <p class="text-gray-700 whitespace-pre-line">{{ instagramProfile.biography }}</p>
      </div>
    </div>
    <div v-else class="card">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 class="text-lg font-semibold text-slate-900">Account Instagram non collegato</h2>
          <p class="mt-1 text-sm text-slate-600">Collega l'account Meta per visualizzare i dati del profilo e gestire i DM.</p>
        </div>
        <a
          :href="metaOAuthHref"
          rel="noopener noreferrer"
          class="btn-primary whitespace-nowrap"
          @click="onInstagramOAuthClick"
        >
          Collega account Meta
        </a>
      </div>
    </div>

    <div v-if="n8nConfigError" class="card">
      <div class="flex items-start gap-3">
        <div class="mt-0.5 h-9 w-9 rounded-2xl bg-yellow-100 text-yellow-700 flex items-center justify-center">
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.518 11.59c.75 1.334-.213 2.99-1.742 2.99H3.48c-1.53 0-2.492-1.656-1.743-2.99l6.52-11.59zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-.993.883L9 6v4a1 1 0 00.883.993L10 11a1 1 0 00.993-.883L11 10V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="min-w-0">
          <h3 class="text-sm font-semibold text-slate-900">Comunicazione Meta — Revisione Instagram in corso</h3>
          <div class="mt-2 text-sm text-slate-700 space-y-2">
            <p>L'app è in revisione per le autorizzazioni Instagram. Alcune funzioni potrebbero essere limitate finché l'approvazione non è completata.</p>
            <ul class="list-disc list-inside">
              <li>DM consultabili dai thread esistenti; invio consentito solo verso utenti che hanno scritto nelle ultime 24h.</li>
              <li>Profilo e metriche sono mostrati dal database locale; la sincronizzazione riprenderà automaticamente dopo l'approvazione.</li>
              <li>Webhook e sottoscrizioni attivi; la consegna eventi può essere parziale durante la revisione.</li>
            </ul>
            <p class="font-semibold text-slate-900">Prossimi passi</p>
            <ul class="list-disc list-inside">
              <li>Completa la verifica aziendale e la App Review nel pannello Meta.</li>
              <li>Allega evidenze funzionali e assicurati di rispettare le policy della piattaforma.</li>
              <li>In caso di esito negativo, ripresenta la richiesta con le correzioni indicate.</li>
            </ul>
            <p>Tempi medi di approvazione: 1–3 giorni lavorativi. Riceverai una notifica via email.</p>
          </div>
        </div>
      </div>
    </div>
    <div v-if="instagramProfile" class="sticky top-[72px] z-20">
      <nav class="card p-2 flex gap-2">
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
          <span v-if="followersTotal" class="ml-1 text-xs opacity-70">({{ followersTotal }})</span>
        </button>
        <button
          @click="activeTab = 'following'"
          class="px-3 py-2 rounded-xl text-sm font-semibold transition"
          :class="activeTab === 'following'
            ? 'bg-slate-900 text-white'
            : 'text-slate-700 hover:bg-slate-900/5'"
        >
          Following
        </button>
      </nav>
    </div>

    <!-- DM Tab -->
    <div v-if="instagramProfile && activeTab === 'dm'" class="space-y-6">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div class="flex items-center">
          <AlertCircle class="w-5 h-5 text-yellow-400 mr-2" />
          <p class="text-sm text-yellow-800">
            <strong>Nota importante:</strong> Puoi inviare messaggi solo agli utenti che ti hanno già contattato. 
            Instagram non permette l'invio di messaggi a utenti che non hanno mai interagito con te.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1">
          <div class="card">
            <h3 class="text-lg font-semibold text-slate-900 mb-4">Conversazioni DM</h3>
            <div class="space-y-3">
              <div
                v-for="conversation in pagedConversations"
                :key="conversation.id"
                @click="selectDMConversation(conversation)"
                class="p-3 rounded-2xl cursor-pointer transition-colors border"
                :class="selectedDMConversation?.id === conversation.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'hover:bg-slate-900/5 border-slate-200/70 text-slate-900'"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
                    <Instagram class="w-5 h-5 opacity-90" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold truncate">
                      {{ conversation.username }}
                    </p>
                    <p class="text-sm opacity-75 truncate">
                      {{ conversation.lastMessage }}
                    </p>
                    <p class="text-xs opacity-60">
                      {{ conversation.time }}
                    </p>
                  </div>
                  <div v-if="conversation.unread > 0" class="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {{ conversation.unread }}
                  </div>
                </div>
              </div>
            </div>
            <!-- Pagination -->
            <div v-if="convTotalPages > 1" class="mt-3 flex items-center justify-between text-xs text-slate-500">
              <button class="btn-secondary py-1 px-2 text-xs" :disabled="convPage <= 1" @click="convPrev">‹ Prec</button>
              <span>{{ convPage }} / {{ convTotalPages }}</span>
              <button class="btn-secondary py-1 px-2 text-xs" :disabled="convPage >= convTotalPages" @click="convNext">Succ ›</button>
            </div>
          </div>
        </div>

        <div class="lg:col-span-2">
          <div v-if="selectedDMConversation" class="card">
            <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
                  <Instagram class="w-5 h-5 opacity-90" />
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-slate-900">{{ selectedDMConversation.username }}</h3>
                  <p class="text-sm text-slate-500">{{ selectedDMConversation.fullName }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button class="text-slate-500 hover:text-slate-900">
                  <MoreVertical class="w-5 h-5" />
                </button>
              </div>
            </div>

            <div ref="igMsgContainer" class="mt-2 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 h-64 overflow-y-auto">
              <div class="space-y-4">
                <div v-if="selectedDMConversation.messages.length === 0" class="text-center text-slate-500 text-sm py-10">
                  Nessun messaggio. Inizia la conversazione!
                </div>
                <div
                  v-for="message in selectedDMConversation.messages"
                  :key="message.id"
                  class="flex"
                  :class="isOutboundDirection(message.direction) ? 'justify-end' : 'justify-start'"
                >
                  <div
                    class="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm"
                    :class="isOutboundDirection(message.direction) 
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
              <Instagram class="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p class="text-gray-500">Seleziona una conversazione DM per iniziare</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="instagramProfile && activeTab === 'bulk'" class="space-y-6">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div class="flex items-center">
          <AlertCircle class="w-5 h-5 text-yellow-400 mr-2" />
          <p class="text-sm text-yellow-800">
            <strong>Nota importante:</strong> Puoi inviare messaggi solo agli utenti che ti hanno già contattato. 
            Instagram non permette l'invio di messaggi a utenti che non hanno mai interagito con te.
          </p>
        </div>
      </div>

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
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utente</th>
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
                  <div class="text-sm font-medium text-gray-900">{{ conversation.username }}</div>
                  <div class="text-xs text-gray-500">{{ conversation.fullName || '' }}</div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 truncate max-w-md">{{ conversation.lastMessage }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ conversation.time }}</td>
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

    <!-- Followers Tab -->
    <div v-if="instagramProfile && activeTab === 'followers'" class="space-y-6">
      <div class="card">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-900">Followers <span class="text-gray-500 text-sm">({{ followersTotal }})</span></h2>
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
          <div v-for="follower in filteredFollowers" :key="follower.id" class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-center space-x-3 mb-3">
              <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <User class="w-6 h-6 text-gray-500" />
              </div>
              <div class="flex-1">
                <h3 class="font-medium text-gray-900">{{ follower.username }}</h3>
                <p class="text-sm text-gray-500">{{ follower.fullName }}</p>
              </div>
            </div>
            <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ follower.bio }}</p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">
                Follower da: {{ follower.followerSince }}
              </span>
              <button 
                @click="openDMChat(follower)"
                :disabled="!follower.canMessage"
                class="text-sm px-3 py-1 rounded"
                :class="follower.canMessage 
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'"
              >
                {{ follower.canMessage ? 'Apri Chat' : 'Non disponibile' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Following Tab -->
    <div v-if="instagramProfile && activeTab === 'following'" class="space-y-6">
      <div class="card">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-900">Following</h2>
          <div class="flex items-center space-x-3">
            <div class="relative">
              <Search class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca following..."
                class="input-field pl-10 w-64"
                v-model="searchFollowingQuery"
              />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="following in filteredFollowing" :key="following.id" class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-center space-x-3 mb-3">
              <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <User class="w-6 h-6 text-gray-500" />
              </div>
              <div class="flex-1">
                <h3 class="font-medium text-gray-900">{{ following.username }}</h3>
                <p class="text-sm text-gray-500">{{ following.fullName }}</p>
              </div>
            </div>
            <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ following.bio }}</p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">
                Segui da: {{ following.followerSince }}
              </span>
              <button 
                @click="openDMChat(following)"
                :disabled="!following.canMessage"
                class="text-sm px-3 py-1 rounded"
                :class="following.canMessage 
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'"
              >
                {{ following.canMessage ? 'Apri Chat' : 'Non disponibile' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import {
  apiBase
} from '@/utils/api'
import { useMetaConnection } from '@/composables/useMetaConnection'
import { useToast } from '@/composables/useToast'
import { usePoll } from '@/composables/usePoll'
import { usePagination } from '@/composables/usePagination'
import type {
  InstagramConversation,
  InstagramFollower,
  Message
} from '@/types'
import {
  RefreshCw,
  AlertCircle,
  Search,
  User,
  Instagram,
  MoreVertical,
  Image,
  Send
} from 'lucide-vue-next'
import { useInstagramStore } from '@/stores'
import { storeToRefs } from 'pinia'

const { isConnected: metaLinked, validateConnection } = useMetaConnection()
const { showToast, showMessageToast } = useToast()
const igStore = useInstagramStore()

const {
  activeTab,
  conversations: dmConversations,
  selectedConversation: selectedDMConversation,
  profile: instagramProfile,
  n8nConfigError,
  bulkSelectedThreadIds,
  bulkMessage,
  followers,
} = storeToRefs(igStore)

const {
  page: convPage,
  totalPages: convTotalPages,
  paged: pagedConversations,
  prev: convPrev,
  next: convNext,
  reset: convPageReset,
} = usePagination(dmConversations, 20)

const igMsgContainer = ref<HTMLElement | null>(null)
const scrollToBottom = () => nextTick(() => {
  if (igMsgContainer.value) igMsgContainer.value.scrollTop = igMsgContainer.value.scrollHeight
})

// UI-only state (not shared)
const newDMMessage = ref('')
const searchFollowersQuery = ref('')
const searchFollowingQuery = ref('')
const bulkStatus = ref('')
const bulkStatusType = ref<'success' | 'error' | ''>('')
const bulkRateMs = ref(1000)
const bulkConcurrency = ref(1)
const bulkSending = ref(false)

const clearInstagramExpired = () => {
  n8nConfigError.value = false
}

const markInstagramExpired = (data: any) => {
  void data
  n8nConfigError.value = true
  showToast('Sessione Instagram scaduta. Ricollega l\'account.', 'error')
}

const route = useRoute()
const onInstagramOAuthClick = () => {
  try {
    localStorage.setItem('postOAuthRedirect', route.fullPath)
    localStorage.setItem('metaOAuthStartAt', String(Date.now()))
    sessionStorage.removeItem('metaLinked')
    window.dispatchEvent(new CustomEvent('meta:unlinked'))
    metaLinked.value = false
    instagramProfile.value = null
    clearInstagramData()
  } catch {
    instagramProfile.value = null
  }
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

const bulkSelectedCount = computed(() => bulkSelectedThreadIds.value.size)
const canBulkSendText = computed(() => !bulkSending.value && bulkSelectedThreadIds.value.size > 0 && bulkMessage.value.trim().length > 0 && !n8nConfigError.value)
const isBulkSelected = (threadId: string) => bulkSelectedThreadIds.value.has(String(threadId || ''))
const toggleBulkSelect = (threadId: string) => igStore.toggleBulkThread(threadId)
const bulkSelectAll = () => {
  const s = new Set(igStore.bulkSelectedThreadIds)
  dmConversations.value.forEach(c => { const id = String(c?.id || ''); if (id) s.add(id) })
  igStore.bulkSelectedThreadIds = s
}
const bulkClearSelection = () => igStore.clearBulkSelection()

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))
const runBulk = async (items: string[], worker: (threadId: string) => Promise<boolean>) => {
  let success = 0, failed = 0, done = 0
  const total = items.length
  const queue = [...items]
  const runOne = async (threadId: string) => {
    try {
      const ok = await worker(threadId)
      if (ok) success++; else failed++
    } catch {
      failed++
    } finally {
      done++
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
  return { success, failed, done, total }
}

const bulkSendText = async () => {
  if (!canBulkSendText.value) return
  bulkSending.value = true
  bulkStatusType.value = ''
  bulkStatus.value = 'Invio in corso...'
  const threadIds = Array.from(bulkSelectedThreadIds.value)
  const { success, failed } = await runBulk(threadIds, async (threadId) => {
    const conv = dmConversations.value.find(c => String(c?.id || '') === String(threadId))
    const recipient = String(conv?.user_id || conv?.id || '').trim()
    if (!recipient) return false
    const result = await igStore.sendDM(recipient, bulkMessage.value)
    return result.status === 'ok'
  })
  bulkStatus.value = `Inviati: ${success}, falliti: ${failed}, totali: ${threadIds.length}`
  bulkStatusType.value = failed === 0 ? 'success' : 'error'
  bulkSending.value = false
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

const isOutboundDirection = (direction: any) => {
  const raw = String(direction || '').toLowerCase().trim()
  return raw === 'outgoing' || raw === 'outbound' || raw === 'sent'
}

const normalizeTimestamp = (v: any) => {
  if (v == null) return ''
  if (typeof v === 'number' && Number.isFinite(v)) {
    const ms = v > 1e12 ? v : v * 1000
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? '' : d.toISOString()
  }
  const s = String(v || '').trim()
  if (!s) return ''
  const n = Number(s)
  if (Number.isFinite(n) && s.length >= 9) {
    const ms = n > 1e12 ? n : n * 1000
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? '' : d.toISOString()
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toISOString()
}

const inferInstagramDMDirection = (m: any): 'incoming' | 'outgoing' => {
  const raw = String(m?.direction ?? m?.type ?? '').toLowerCase().trim()
  if (raw) {
    if (raw.includes('out')) return 'outgoing'
    if (raw.includes('in')) return 'incoming'
    if (raw === 'sent') return 'outgoing'
    if (raw === 'received') return 'incoming'
  }

  const senderRaw = String(m?.sender ?? m?.from ?? m?.author ?? '').toLowerCase().trim()
  if (senderRaw) {
    if (senderRaw === 'me' || senderRaw === 'self' || senderRaw === 'page' || senderRaw === 'business') return 'outgoing'
    if (senderRaw === 'them' || senderRaw === 'user' || senderRaw === 'customer') return 'incoming'
  }

  const boolOutgoing = Boolean(
    m?.from_self === true ||
    m?.fromSelf === true ||
    m?.from_me === true ||
    m?.fromMe === true ||
    m?.is_outgoing === true ||
    m?.isOutgoing === true ||
    m?.outgoing === true ||
    m?.is_sent_by_viewer === true ||
    m?.isSentByViewer === true ||
    m?.sent_by_us === true ||
    m?.sentByUs === true
  )
  if (boolOutgoing) return 'outgoing'

  const myId = String(instagramProfile.value?.id || '').trim()
  const myUsername = String(instagramProfile.value?.username || '').trim().replace(/^@/, '').toLowerCase()
  const fromId = String(m?.from?.id ?? m?.sender?.id ?? m?.from_id ?? m?.sender_id ?? m?.user_id ?? m?.author_id ?? '').trim()
  const fromUsername = String(m?.from?.username ?? m?.sender?.username ?? m?.from_username ?? m?.sender_username ?? m?.username ?? '').trim().replace(/^@/, '').toLowerCase()

  if (myId && fromId && fromId === myId) return 'outgoing'
  if (myUsername && fromUsername && fromUsername === myUsername) return 'outgoing'

  const otherId = String(selectedDMConversation.value?.user_id || '').trim()
  if (otherId && fromId) return fromId === otherId ? 'incoming' : 'outgoing'

  const otherUsername = String(selectedDMConversation.value?.username || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
  if (otherUsername && fromUsername) return fromUsername === otherUsername ? 'incoming' : 'outgoing'

  const toList = (m?.to?.data ?? m?.to ?? m?.recipients ?? m?.recipient ?? m?.participants ?? []) as any
  const recipients = Array.isArray(toList) ? toList : (toList ? [toList] : [])
  const toIds = recipients.map((r: any) => String(r?.id ?? r?.user_id ?? r).trim()).filter(Boolean)
  const toUsernames = recipients
    .map((r: any) => String(r?.username ?? r?.user?.username ?? r).trim().replace(/^@/, '').toLowerCase())
    .filter(Boolean)

  if (myId && toIds.includes(myId)) return 'incoming'
  if (myUsername && toUsernames.includes(myUsername)) return 'incoming'

  return 'incoming'
}

const clearInstagramData = () => {
  dmConversations.value = []
  selectedDMConversation.value = null
  igStore.clearBulkSelection()
  followers.value = []
  bulkStatus.value = ''
  bulkStatusType.value = ''
  n8nConfigError.value = false
}

const loadInstagramProfile = async () => {
  igStore.profile = null
  await igStore.loadProfile()
  if (igStore.authExpired) {
    markInstagramExpired({})
  } else if (!igStore.profile) {
    n8nConfigError.value = true
  } else {
    clearInstagramExpired()
  }
}

// followers is from store (igStore.followers via storeToRefs)

const following = ref<InstagramFollower[]>([
  {
    id: 1,
    username: '@tech_news',
    fullName: 'Tech News Italia',
    bio: 'Le ultime notizie dal mondo della tecnologia',
    followerSince: '6 mesi fa',
    canMessage: false
  },
  {
    id: 2,
    username: '@design_daily',
    fullName: 'Design Daily',
    bio: 'Inspirazione e risorse per designer',
    followerSince: '4 mesi fa',
    canMessage: false
  }
])

const filteredFollowers = computed(() => {
  if (!searchFollowersQuery.value) return followers.value
  return followers.value.filter(follower => 
    follower.username.toLowerCase().includes(searchFollowersQuery.value.toLowerCase()) ||
    follower.fullName.toLowerCase().includes(searchFollowersQuery.value.toLowerCase())
  )
})

const followersTotal = computed(() => followers.value.length)

const filteredFollowing = computed(() => {
  if (!searchFollowingQuery.value) return following.value
  return following.value.filter(following => 
    following.username.toLowerCase().includes(searchFollowingQuery.value.toLowerCase()) ||
    following.fullName.toLowerCase().includes(searchFollowingQuery.value.toLowerCase())
  )
})

const loadFollowersFromCleanHtml = async () => {
  if (!instagramProfile.value) {
    igStore.followers = []
    return
  }
  try {
    const url = new URL('../../../follower-ig-clean.html', import.meta.url).href
    const resp = await fetch(url)
    if (!resp.ok) return
    const html = await resp.text()
    const arr: InstagramFollower[] = []
    const re = /<a\s+href=\"https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\"[^>]*>([^<]+)<\/a>/gi
    let id = 1
    let m: RegExpExecArray | null
    while ((m = re.exec(html))) {
      const u = (m[1] || m[2]).trim()
      if (!u) continue
      arr.push({ id: id++, username: '@' + u, fullName: '', bio: '', followerSince: '', canMessage: false })
    }
    igStore.followers = arr
  } catch {}
}

const selectDMConversation = async (conversation: any) => {
  selectedDMConversation.value = conversation
  await loadDMMessages(conversation.id)
}

const sendDMMessage = async () => {
  if (!newDMMessage.value.trim() || !selectedDMConversation.value) return
  const recipient = selectedDMConversation.value.user_id || selectedDMConversation.value.id
  try {
    const result = await igStore.sendDM(recipient, newDMMessage.value)
    if (result.status === 'ok') {
      newDMMessage.value = ''
      await loadDMMessages(selectedDMConversation.value.id)
    }
  } catch {}
}

const openDMChat = (user: any) => {
  if (!user.canMessage) return
  
  // Trova o crea conversazione esistente
  const existingConversation = dmConversations.value.find(conv => conv.username === user.username)
  if (existingConversation) {
    selectDMConversation(existingConversation)
    activeTab.value = 'dm'
  }
}

const loadDMConversations = async () => {
  const limit = 1
  if (!instagramProfile.value) {
    igStore.conversations = []
    n8nConfigError.value = false
    return
  }
  n8nConfigError.value = false
  await igStore.loadConversations(limit)
  convPageReset()
}

const loadDMMessages = async (threadId: string) => {
  if (!instagramProfile.value) {
    const idx = dmConversations.value.findIndex(c => c.id === threadId)
    if (idx >= 0) dmConversations.value[idx].messages = []
    if (selectedDMConversation.value?.id === threadId) selectedDMConversation.value.messages = []
    n8nConfigError.value = false
    return
  }
  n8nConfigError.value = false
  await igStore.loadMessages(threadId)
  const msgs = igStore.messages[threadId] || []
  const idx = dmConversations.value.findIndex(c => c.id === threadId)
  if (idx >= 0) dmConversations.value[idx].messages = msgs
  if (selectedDMConversation.value?.id === threadId) selectedDMConversation.value.messages = msgs
}

const _igLastConvTs = new Map<string, string>()
let _igTsInit = false

const { start: startPolling, stop: stopPolling } = usePoll(async () => {
  if (!instagramProfile.value) return
  const prevTs = new Map(_igLastConvTs)
  const firstLoad = !_igTsInit
  await loadDMConversations()
  for (const conv of dmConversations.value) {
    const t = String((conv as any).lastAt || (conv as any).time || '')
    if (!firstLoad) {
      const prev = prevTs.get(conv.id)
      if (prev && t && t !== prev) {
        const name = (conv as any).username || (conv as any).fullName || 'Utente'
        const preview = (conv as any).lastMessage ? String((conv as any).lastMessage).slice(0, 80) : undefined
        showMessageToast('instagram', name, preview)
      }
    }
    if (t) _igLastConvTs.set(conv.id, t)
  }
  _igTsInit = true
}, { interval: 15000, immediate: false })

const { start: startMsgPoll, stop: stopMsgPoll } = usePoll(async () => {
  if (selectedDMConversation.value) await loadDMMessages(selectedDMConversation.value.id)
}, { interval: 3000, immediate: false })

watch(() => selectedDMConversation.value?.id, (id) => {
  stopMsgPoll()
  if (id) startMsgPoll()
})
watch(() => selectedDMConversation.value?.messages?.length, scrollToBottom)
watch(() => selectedDMConversation.value?.id, scrollToBottom)

let refreshPromise: Promise<void> | null = null
let refreshQueued = false

const doRefreshAll = async () => {
  // metaLinked is managed by useMetaConnection
  if (!metaLinked.value) {
    igStore.profile = null
    clearInstagramData()
    stopPolling()
    return
  }
  await loadInstagramProfile()
  if (!instagramProfile.value) {
    clearInstagramData()
    stopPolling()
    return
  }
  await loadDMConversations()
  await loadFollowersFromCleanHtml()
  startPolling()
}

const refreshAll = async () => {
  if (refreshPromise) {
    refreshQueued = true
    return refreshPromise
  }
  refreshPromise = (async () => {
    do {
      refreshQueued = false
      await doRefreshAll()
    } while (refreshQueued)
  })().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

watch(metaLinked, async (connected: boolean) => {
  if (connected) {
    await refreshAll()
  } else {
    igStore.profile = null
    clearInstagramData()
    stopPolling()
  }
})

onMounted(async () => {
  await validateConnection()
  await refreshAll()
})
</script>
