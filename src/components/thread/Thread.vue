<template>
  <div class="h-full flex flex-col gap-3">
    <div class="flex-1 overflow-hidden card p-0">
      <div class="h-full overflow-y-auto p-4 bg-slate-50/50" ref="scrollEl">
        <div v-if="loading" class="h-24 flex items-center justify-center rounded-2xl bg-white/60 border border-slate-200/70">
          <span class="text-sm font-medium text-slate-500">caricamento…</span>
        </div>
        <div v-else-if="!messages.length" class="h-24 flex items-center justify-center rounded-2xl bg-white/60 border border-slate-200/70">
          <span class="text-sm font-medium text-slate-500">nessun messaggio</span>
        </div>
        <div v-else>
          <div v-for="m in messages" :key="m.id" class="mb-3 flex" :class="bubbleSide(m)">
            <div class="max-w-[70%] px-4 py-3 rounded-2xl shadow-sm" :class="bubbleStyle(m)">
              <div v-if="m.media_url" class="mb-2">
                <img :src="m.media_url" alt="media" class="rounded-xl" />
              </div>
              <div class="text-sm whitespace-pre-wrap">{{ m.content || '[senza contenuto]' }}</div>
              <div class="mt-1 text-xs opacity-70">{{ fmtTime(m.time) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="card px-3 py-3 flex items-center gap-2">
      <input v-model="text" type="text" class="input-field flex-1" placeholder="Scrivi un messaggio…" />
      <button class="btn-primary h-10 disabled:opacity-60 disabled:cursor-not-allowed" :disabled="sending || !text.trim()" @click="send">
        Invia
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { sendWaMessage } from '@/services/metaApiService'
import { startLoading, stopLoading } from '@/composables/useLoader'
import { useToast } from '@/composables/useToast'
import { usePoll } from '@/composables/usePoll'
import { normalizeMessage, deduplicatePendingMessages } from './threadUtils'
import { useInstagramStore } from '@/stores/instagram'
import { useFacebookStore } from '@/stores/facebook'
import type { Message } from '@/types'

const props = defineProps<{ conversation_id?: string; platform?: string; contact_id?: string }>()

const igStore = useInstagramStore()
const fbStore = useFacebookStore()

const { showToast } = useToast()
const loading = ref(true)
const serverMessages = ref<Message[]>([])
const pendingMessages = ref<Message[]>([])

const messages = computed(() => {
  const combined = [...serverMessages.value, ...pendingMessages.value]
  // Sort by time. If times are equal, preserve order (stable sort).
  // Pending messages usually have very recent time.
  return combined.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
})

const text = ref('')
const sending = ref(false)
const scrollEl = ref<HTMLElement | null>(null)

const fmtTime = (d?: string) => {
  if (!d) return ''
  try { return new Date(d).toLocaleTimeString('it-IT') } catch { return '' }
}

const isOutgoing = (m: Message) => {
  return m.direction === 'outgoing'
}

const bubbleSide = (m: Message) => {
  return isOutgoing(m) ? 'justify-end' : 'justify-start'
}

const bubbleStyle = (m: Message) => {
  const base = isOutgoing(m)
    ? 'bg-primary-600 text-white shadow-primary-600/15'
    : 'bg-white/80 text-slate-900 border border-slate-200/70'
  
  if (m.status === 'failed') return `${base} border-red-500 border-2 opacity-80`
  if (m.status === 'sending') return `${base} opacity-70`
  return base
}

const load = async (isPolling = false) => {
  if (!isPolling) {
    loading.value = true
    startLoading()
  }
  
  try {
    let rawData: any[] = []
    if (props.platform === 'whatsapp' && props.contact_id) {
      const phone = String(props.contact_id).replace(/\D/g, '')
      const { data: waData, error: waError } = await supabase
        .from('wa_messages')
        .select('id, content, direction, timestamp, created_at, contact_phone')
        .eq('contact_phone', phone)
        .order('timestamp', { ascending: true, nullsFirst: false })
        .limit(200)
      if (!waError) {
        rawData = (waData || []).map((m: any) => ({
          id: m.id,
          content: m.content || '',
          direction: m.direction,
          created_at: m.timestamp || m.created_at || '',
          timestamp: m.timestamp || m.created_at || '',
        }))
      }
    } else if (props.platform === 'instagram' && props.conversation_id) {
      await igStore.loadMessages(props.conversation_id)
      rawData = (igStore.messages[props.conversation_id] || []).map(m => ({ ...m }))
    } else if (props.platform === 'facebook' && props.conversation_id) {
      await fbStore.loadMessages(props.conversation_id)
      rawData = (fbStore.messages[props.conversation_id] || []).map(m => ({ ...m }))
    }
    
    // Normalize and reverse
    const newServerMessages = rawData.map(normalizeMessage).reverse()
    
    // Deduplicate pending messages
    if (pendingMessages.value.length > 0) {
      pendingMessages.value = deduplicatePendingMessages(newServerMessages, pendingMessages.value)
    }
    
    // Check if we need to update scroll
    const el = scrollEl.value
    const isAtBottom = el ? (el.scrollHeight - el.scrollTop - el.clientHeight < 50) : true
    
    // Simple diff on server messages
    const hasChanges = newServerMessages.length !== serverMessages.value.length || 
                       (newServerMessages.length > 0 && serverMessages.value.length > 0 && newServerMessages[newServerMessages.length - 1].id !== serverMessages.value[serverMessages.value.length - 1].id)
    
    if (hasChanges || !isPolling) {
      serverMessages.value = newServerMessages
      await nextTick()
      if ((!isPolling || isAtBottom) && el) {
        el.scrollTop = el.scrollHeight
      }
    }
  } catch (e) {
    console.error('Failed to load messages', e)
    if (!isPolling) {
      showToast('Errore nel caricamento dei messaggi', 'error')
    }
  } finally {
    if (!isPolling) {
      loading.value = false
      stopLoading()
    }
  }
}

const poll = usePoll(() => load(true), { interval: 10000 })

const send = async () => {
  if (!props.platform || !props.contact_id) return
  sending.value = true
  
  const tempId = `tmp-${Date.now()}`
  const optimistic: Message = { 
    id: tempId, 
    content: text.value, 
    time: new Date().toISOString(), 
    direction: 'outgoing',
    status: 'sending'
  }
  
  pendingMessages.value.push(optimistic)
  const textToSend = text.value
  text.value = '' // Clear input immediately
  
  // Force scroll to bottom for new message
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  
  try {
    if (props.platform === 'whatsapp') {
      const phone = String(props.contact_id || '').replace(/\D/g, '')
      const result = await sendWaMessage(phone, textToSend)
      if (result.status !== 'ok') throw new Error(result.error || 'Send failed')
    }
    else if (props.platform === 'instagram') {
      const result = await igStore.sendDM(String(props.contact_id), textToSend)
      if (result?.status !== 'ok') throw new Error(result?.error || 'Send failed')
    }
    else if (props.platform === 'facebook') {
      const result = await fbStore.sendMessage(String(props.contact_id), textToSend)
      if (result?.status !== 'ok') throw new Error(result?.error || 'Send failed')
    }
    
    // Mark as sent (will be removed by load() if found on server)
    const p = pendingMessages.value.find(m => m.id === tempId)
    if (p) p.status = 'sent'
    
    poll.boost() // Trigger immediate update and faster polling for a while
  } catch (e) {
    console.error('Send failed', e)
    const p = pendingMessages.value.find(m => m.id === tempId)
    if (p) p.status = 'failed'
    showToast('Errore invio messaggio', 'error')
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  await load(false)
  poll.start()
})
onBeforeUnmount(() => { 
  poll.stop()
})

watch(() => [props.conversation_id, props.platform, props.contact_id], async () => {
  await load()
  poll.run() // Ensure we poll immediately after change? load() handles one run.
})
</script>

<style scoped>
</style>
