import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useWhatsAppStore } from '@/stores'
import { usePoll } from './usePoll'
import { useToast } from './useToast'
import { fmtDateTime, sortMessagesByCreatedAt, normalizePhone, normalizePhoneInput } from './useWhatsAppFormatting'
import type { Message } from '@/types'

export const useWhatsAppMessaging = () => {
  const waStore = useWhatsAppStore()
  const { selectedConversation, conversations, n8nConfigError } = storeToRefs(waStore)
  const { showToast } = useToast()

  const _waLastConvTs = new Map<string, string>()
  let _waTsInit = false

  const newMessage = ref('')
  const sendStatus = ref('')
  const sendStatusType = ref<'success' | 'error' | ''>('')

  // Pending messages: track locally until backend confirms
  const pendingByConv: Record<string, Message[]> = {}
  const inflightMessagesByConvId = new Map<string, Promise<void>>()

  const loadPendingLocal = () => {
    try {
      const raw = localStorage.getItem('wa_pending_by_conv')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        Object.keys(parsed).forEach(k => {
          if (Array.isArray(parsed[k])) pendingByConv[k] = parsed[k]
        })
      }
    } catch {}
  }

  const savePendingLocal = () => {
    try { localStorage.setItem('wa_pending_by_conv', JSON.stringify(pendingByConv)) } catch {}
  }

  const conversationsCount = computed(() => conversations.value.length)

  const ensureConversationInList = (conv: any) => {
    if (!conv) return
    const existsById = conversations.value.some(c => String(c.id) === String(conv.id))
    const existsByPhone = conversations.value.some(c => String(c.phone) === String(conv.phone))
    if (existsById || existsByPhone) return
    conversations.value = [{
      id: conv.id || conv.phone,
      contact: conv.contact || conv.phone || 'Contatto',
      phone: conv.phone || '',
      lastMessage: conv.lastMessage || '',
      time: conv.time || '',
      unread: 0,
      messages: [],
    }, ...conversations.value]
  }

  const pushLocalMessage = (conversationId: string, content: string, direction: string = 'outbound') => {
    const created_at = new Date().toISOString()
    const msg: any = {
      id: String(Date.now()),
      content,
      direction: direction === 'inbound' ? 'incoming' : 'outgoing',
      created_at,
      time: fmtDateTime(created_at),
    }
    const idx = conversations.value.findIndex(c => c.id === conversationId)
    if (idx >= 0) {
      const existing = conversations.value[idx].messages || []
      conversations.value[idx].messages = sortMessagesByCreatedAt([msg, ...existing]) as Message[]
      conversations.value[idx].lastMessage = content
      conversations.value[idx].time = msg.time
    } else {
      const sel = selectedConversation.value || {} as any
      conversations.value = [{
        id: conversationId,
        contact: sel.contact || sel.phone || 'Contatto',
        phone: sel.phone || '',
        lastMessage: content,
        time: msg.time,
        unread: 0,
        messages: [msg] as Message[],
      }, ...conversations.value]
    }
    if (selectedConversation.value?.id === conversationId) {
      const current = selectedConversation.value.messages || []
      selectedConversation.value.messages = sortMessagesByCreatedAt([msg, ...current]) as Message[]
      selectedConversation.value.lastMessage = content
      selectedConversation.value.time = msg.time
    }
    if (!pendingByConv[conversationId]) pendingByConv[conversationId] = []
    pendingByConv[conversationId].unshift(msg as Message)
    savePendingLocal()
  }

  const loadMessages = async (conversationId: string) => {
    const existing = inflightMessagesByConvId.get(conversationId)
    if (existing) return existing
    const task = (async () => {
      const conv = conversations.value.find(c => c.id === conversationId)
      if (!conv || !conv.phone) return
      await waStore.loadMessages(conv.phone)
      const rawMsgs = waStore.messages[conv.phone] || []
      const filtered = rawMsgs.filter((m: any) => {
        const content = String(m.content || '').trim().toLowerCase()
        if (!m.content || content.length === 0) return false
        if (content === 'sent' || content === 'delivered' || content === 'failed') return false
        return m.direction === 'incoming' || m.direction === 'outgoing'
      })
      const dedupMap = new Map<string, any>()
      for (const m of filtered) {
        const key = m.id ? `id:${m.id}` : `k:${m.direction}:${m.content}:${m.created_at}`
        if (!dedupMap.has(key)) dedupMap.set(key, m)
      }
      const msgs: Message[] = Array.from(dedupMap.values()).map((m: any) => ({
        id: m.id,
        content: m.content || '',
        direction: m.direction as 'incoming' | 'outgoing',
        created_at: m.created_at || m.time || '',
        time: m.time || (m.created_at ? fmtDateTime(m.created_at) : ''),
        status: m.status,
      }))
      const sorted = sortMessagesByCreatedAt(msgs) as Message[]
      const pend = pendingByConv[conversationId] || []
      const merged = [...sorted]
      for (const pm of pend) {
        if (!merged.find(x => x.content === pm.content && x.direction === pm.direction)) merged.push(pm)
      }
      const finalList = sortMessagesByCreatedAt(merged) as Message[]
      const idx = conversations.value.findIndex(c => c.id === conversationId)
      if (idx >= 0) conversations.value[idx].messages = finalList
      if (selectedConversation.value?.id === conversationId) selectedConversation.value.messages = finalList
      if (pend.length) {
        const confirmed = pend.filter(pm => finalList.some(x => x.content === pm.content && x.direction === pm.direction && x.id !== pm.id))
        if (confirmed.length) pendingByConv[conversationId] = pend.filter(pm => !confirmed.includes(pm))
      }
    })().finally(() => { inflightMessagesByConvId.delete(conversationId) })
    inflightMessagesByConvId.set(conversationId, task)
    return task
  }

  const selectConversation = (conversation: any) => {
    selectedConversation.value = conversation
    loadMessages(conversation.id)
  }

  const loadConversations = async (_force: boolean = false) => {
    try {
      const prevTs = new Map(_waLastConvTs)
      const firstLoad = !_waTsInit
      await waStore.loadConversations()
      for (const conv of conversations.value as any[]) {
        const rawTime = String(conv.time || '')
        // Detect new messages before formatting overwrites the raw time
        if (!firstLoad) {
          const prev = prevTs.get(String(conv.id))
          if (prev && rawTime && rawTime !== prev) {
            const name = (conv as any).contact || (conv as any).phone || 'Contatto'
            const preview = (conv as any).lastMessage ? ` · ${String((conv as any).lastMessage).slice(0, 60)}` : ''
            showToast(`💬 WhatsApp – ${name}${preview}`, 'info', 5000)
          }
        }
        if (rawTime) _waLastConvTs.set(String(conv.id), rawTime)
        if (conv.time && !conv.timeFormatted) {
          conv.timeFormatted = fmtDateTime(conv.time)
          conv.time = conv.timeFormatted
        }
      }
      _waTsInit = true
      if (!selectedConversation.value && conversations.value.length > 0) {
        selectConversation(conversations.value[0])
      }
    } catch {
      n8nConfigError.value = true
    }
  }

  const convPoll = usePoll(loadConversations, { interval: 30000, autoStart: false, immediate: false })
  const msgsPoll = usePoll(async () => {
    const conv = selectedConversation.value
    if (conv && conv.id) await loadMessages(conv.id)
  }, { interval: 15000, backoffOnError: true, autoStart: false, immediate: false })

  watch(n8nConfigError, (err: boolean) => {
    convPoll.currentInterval.value = err ? 120000 : 30000
    msgsPoll.currentInterval.value = err ? 60000 : 15000
    convPoll.restart()
    msgsPoll.restart()
  })

  const sendMessage = async () => {
    if (!newMessage.value.trim() || !selectedConversation.value) return
    const conv = selectedConversation.value
    const convId = conv.id
    const convPhone = conv.phone || ''
    const contentCopy = newMessage.value
    pushLocalMessage(convId, contentCopy, 'outbound')
    newMessage.value = ''
    const result = await waStore.sendMessage(convPhone ? normalizePhoneInput(convPhone) : '', contentCopy)
    if (result.status !== 'ok') {
      sendStatus.value = 'Invio fallito: ' + (result.error || 'errore')
      sendStatusType.value = 'error'
      return
    }
    sendStatus.value = 'Messaggio inviato correttamente'
    sendStatusType.value = 'success'
    msgsPoll.boost()
    if (selectedConversation.value) selectedConversation.value.id = convId
    await loadConversations(true)
    const real = conversations.value.find(c => c.id === convId) || conversations.value.find(c => c.phone === convPhone)
    if (real) selectConversation(real)
    else ensureConversationInList(conv)
    await loadMessages(convId)
  }

  const startChat = (contact: any) => {
    waStore.activeTab = 'messages'
    const conv = { id: String(contact.id), contact: contact.name, phone: contact.phone, lastMessage: '', time: '', unread: 0, messages: [] }
    selectedConversation.value = conv
    setTimeout(async () => {
      await loadConversations()
      const real = conversations.value.find(c => c.phone === contact.phone)
      if (real) selectConversation(real)
    }, 0)
  }

  return {
    newMessage, sendStatus, sendStatusType,
    conversationsCount,
    convPoll, msgsPoll,
    loadPendingLocal, loadConversations, loadMessages,
    selectConversation, startChat, sendMessage,
    pushLocalMessage, ensureConversationInList,
  }
}
