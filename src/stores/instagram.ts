import { defineStore } from 'pinia'
import { isMetaTokenExpiredError } from '@/utils/api'
import {
  getIgProfile,
  listIgConversations,
  getIgMessages,
  sendIgDM,
} from '@/services/metaApiService'
import type { InstagramProfile, InstagramConversation, InstagramFollower, Message } from '@/types'

export const useInstagramStore = defineStore('instagram', {
  state: () => ({
    profile: null as InstagramProfile | null,
    conversations: [] as InstagramConversation[],
    messages: {} as Record<string, Message[]>,
    selectedConversation: null as InstagramConversation | null,
    followers: [] as InstagramFollower[],
    following: [] as InstagramFollower[],
    activeTab: 'dm' as 'dm' | 'bulk' | 'followers' | 'following',
    authExpired: false,
    n8nConfigError: false,
    loading: {
      profile: false,
      conversations: false,
      messages: false,
      followers: false,
    },
    errors: {
      profile: null as string | null,
      conversations: null as string | null,
      messages: null as string | null,
    },
    convPage: 1,
    convPageSize: 5,
    bulkSelectedThreadIds: new Set<string>(),
    bulkMessage: '',
  }),

  actions: {
    setActiveTab(tab: 'dm' | 'bulk' | 'followers' | 'following') {
      this.activeTab = tab
    },

    setSelectedConversation(conv: InstagramConversation | null) {
      this.selectedConversation = conv
    },

    markAuthExpired() {
      this.authExpired = true
    },

    async loadProfile() {
      this.loading.profile = true
      this.errors.profile = null
      try {
        const p = await getIgProfile()
        this.profile = {
          id: p.id,
          username: p.username || '',
          name: p.name || p.username || '',
          biography: p.biography || '',
          profilePictureUrl: p.profile_picture_url || null,
          followersCount: p.followers_count || 0,
          followsCount: p.follows_count || 0,
          mediaCount: p.media_count || 0,
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Errore profilo Instagram'
        if (isMetaTokenExpiredError({ error: { message: msg, code: 190 } })) {
          this.markAuthExpired()
        } else {
          this.errors.profile = msg
        }
      } finally {
        this.loading.profile = false
      }
    },

    async loadConversations(limit = 5, after?: string) {
      this.loading.conversations = true
      this.errors.conversations = null
      try {
        const res = await listIgConversations(limit, after)
        this.conversations = res.data.map((c) => ({
          id: c.id,
          user_id: c.participantId,
          username: c.participantUsername,
          fullName: c.participantName,
          lastMessage: c.lastMessage,
          lastAt: c.lastAt,
          time: c.lastAt,
          unread: 0,
          canMessage: true,
          messages: [],
        }))
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Errore conversazioni Instagram'
        if (msg.includes('credentials not configured') || msg.includes('not configured')) {
          this.n8nConfigError = true
        } else {
          this.errors.conversations = msg
        }
      } finally {
        this.loading.conversations = false
      }
    },

    async loadMessages(threadId: string, _limit = 50) {
      this.loading.messages = true
      this.errors.messages = null
      try {
        const msgs = await getIgMessages(threadId, _limit)
        this.messages[threadId] = msgs.map((m) => ({
          id: m.id,
          content: m.content,
          time: m.createdTime,
          created_at: m.createdTime,
          direction: m.direction,
        }))
      } catch (e: unknown) {
        this.errors.messages = e instanceof Error ? e.message : 'Errore messaggi Instagram'
      } finally {
        this.loading.messages = false
      }
    },

    async sendDM(recipientId: string, text: string) {
      const result = await sendIgDM(recipientId, text)
      return result
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
