import { defineStore } from 'pinia'
import { isMetaTokenExpiredError } from '@/utils/api'
import {
  getFbPage,
  listFbConversations,
  getFbMessages,
  sendFbMessage,
} from '@/services/metaApiService'
import type { FacebookPage, FacebookConversation, Message } from '@/types'

export const useFacebookStore = defineStore('facebook', {
  state: () => ({
    page: null as FacebookPage | null,
    conversations: [] as FacebookConversation[],
    messages: {} as Record<string, Message[]>,
    selectedConversation: null as FacebookConversation | null,
    activeTab: 'dm' as 'dm' | 'bulk' | 'followers',
    authExpired: false,
    n8nConfigError: false,
    loading: {
      page: false,
      conversations: false,
      messages: false,
    },
    errors: {
      page: null as string | null,
      conversations: null as string | null,
      messages: null as string | null,
    },
    bulkSelectedThreadIds: new Set<string>(),
    bulkMessage: '',
  }),

  actions: {
    setActiveTab(tab: 'dm' | 'bulk' | 'followers') {
      this.activeTab = tab
    },

    setSelectedConversation(conv: FacebookConversation | null) {
      this.selectedConversation = conv
    },

    markAuthExpired() {
      this.authExpired = true
    },

    async loadPage() {
      this.loading.page = true
      this.errors.page = null
      try {
        const p = await getFbPage()
        this.page = {
          id: p.id,
          name: p.name || '',
          fanCount: p.fan_count || 0,
          followersCount: p.followers_count || 0,
          pictureUrl: p.picture?.url || null,
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Errore pagina Facebook'
        if (isMetaTokenExpiredError({ error: { message: msg, code: 190 } })) {
          this.markAuthExpired()
        } else if (msg.includes('credentials not configured') || msg.includes('not configured')) {
          this.n8nConfigError = true
        } else {
          this.errors.page = msg
        }
      } finally {
        this.loading.page = false
      }
    },

    async loadConversations() {
      this.loading.conversations = true
      this.errors.conversations = null
      try {
        const items = await listFbConversations()
        this.conversations = items.map((c) => ({
          id: c.id,
          contact: c.senderName || undefined,
          last_message: undefined,
          last_message_at: c.updatedTime,
          psid: c.senderPsid || undefined,
          contact_id: c.senderPsid || undefined,
        }))
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Errore conversazioni Facebook'
        if (msg.includes('credentials not configured') || msg.includes('not configured')) {
          this.n8nConfigError = true
        } else {
          this.errors.conversations = msg
        }
      } finally {
        this.loading.conversations = false
      }
    },

    async loadMessages(threadId: string, limit = 200) {
      this.loading.messages = true
      this.errors.messages = null
      try {
        const msgs = await getFbMessages(threadId, limit)
        this.messages[threadId] = msgs.map((m) => ({
          id: m.id,
          content: m.content,
          time: m.createdTime,
          created_at: m.createdTime,
          direction: m.direction,
        })).sort((a, b) => {
          const ta = new Date(a.created_at || '').getTime()
          const tb = new Date(b.created_at || '').getTime()
          if (isNaN(ta) && isNaN(tb)) return 0
          if (isNaN(ta)) return 1
          if (isNaN(tb)) return -1
          return ta - tb
        })
      } catch (e: unknown) {
        this.errors.messages = e instanceof Error ? e.message : 'Errore messaggi Facebook'
      } finally {
        this.loading.messages = false
      }
    },

    async sendMessage(recipientId: string, text: string, mediaUrl?: string, mediaType?: string) {
      return await sendFbMessage(
        recipientId,
        text,
        mediaUrl,
        mediaType as 'image' | 'file' | 'audio' | 'video' | undefined,
      )
    },

    toggleBulkThread(threadId: string) {
      const s = new Set(this.bulkSelectedThreadIds)
      if (s.has(threadId)) s.delete(threadId)
      else s.add(threadId)
      this.bulkSelectedThreadIds = s
    },

    clearBulkSelection() {
      this.bulkSelectedThreadIds = new Set()
      this.bulkMessage = ''
    },
  },
})
