import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import {
  listWaTemplates,
  getWaPhoneNumbers,
  sendWaMessage,
  sendWaTemplate,
} from '@/services/metaApiService'
import type { WaSendResult } from '@/services/metaApiService'
import type { WhatsAppContact, WhatsAppConversation, WhatsAppTemplate, Message } from '@/types'

interface LoadingState {
  contacts: boolean
  conversations: boolean
  messages: boolean
  templates: boolean
  waStatus: boolean
}

interface ErrorState {
  contacts: string | null
  conversations: string | null
  messages: string | null
}

export const useWhatsAppStore = defineStore('whatsapp', {
  state: () => ({
    contacts: [] as WhatsAppContact[],
    conversations: [] as WhatsAppConversation[],
    messages: {} as Record<string, Message[]>,
    templates: [] as WhatsAppTemplate[],
    selectedConversation: null as WhatsAppConversation | null,
    activeTab: 'contacts' as 'contacts' | 'conversations' | 'bulk' | 'messages' | 'templates',
    loading: {
      contacts: false,
      conversations: false,
      messages: false,
      templates: false,
      waStatus: false,
    } as LoadingState,
    errors: {
      contacts: null,
      conversations: null,
      messages: null,
    } as ErrorState,
    waStatus: '' as string,
    waDisplayNumber: '' as string,
    waVerifiedName: '' as string,
    n8nConfigError: false,
    bulkSelectedPhones: new Set<string>(),
    bulkMessage: '',
  }),

  getters: {
    filteredContacts: (state) => (query: string, tagFilter: string) => {
      const q = query.toLowerCase()
      return state.contacts.filter((c) => {
        const matchQuery =
          !q ||
          c.name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q)
        const matchTag =
          !tagFilter ||
          (Array.isArray(c.tags) ? c.tags.includes(tagFilter) : String(c.tags || '').includes(tagFilter))
        return matchQuery && matchTag
      })
    },
  },

  actions: {
    setActiveTab(tab: 'contacts' | 'conversations' | 'bulk' | 'messages' | 'templates') {
      this.activeTab = tab
    },

    setSelectedConversation(conv: WhatsAppConversation | null) {
      this.selectedConversation = conv
    },

    // ── Data loading ─────────────────────────────────────────────────────────

    async loadContacts() {
      this.loading.contacts = true
      this.errors.contacts = null
      try {
        const { data, error } = await supabase
          .from('wa_contacts')
          .select('id, name, phone, tags, notes, created_at')
          .order('name')
        if (error) throw new Error(error.message)
        this.contacts = (data ?? []).map((c) => ({
          id: c.id,
          name: c.name || c.phone,
          phone: c.phone,
          tags: (c.tags as string[]) || [],
          tag: ((c.tags as string[]) || [])[0] || '',
          notes: c.notes || '',
          lastMessage: '',
        }))
      } catch (e: unknown) {
        this.errors.contacts = e instanceof Error ? e.message : 'Errore caricamento contatti'
      } finally {
        this.loading.contacts = false
      }
    },

    async loadConversations() {
      this.loading.conversations = true
      this.errors.conversations = null
      try {
        const { data, error } = await supabase
          .from('wa_conversations_view')
          .select('phone, last_message, last_at, contact_id, contact_name')
          .order('last_at', { ascending: false })
        if (error) throw new Error(error.message)

        // Preserve existing messages arrays when refreshing
        const existing = new Map(this.conversations.map((c) => [c.id, c]))
        this.conversations = (data ?? []).map((row) => {
          const prev = existing.get(row.phone)
          return {
            id: row.phone,
            contact: row.contact_name || row.phone || 'Contatto',
            phone: row.phone,
            lastMessage: row.last_message || '',
            time: row.last_at || '',
            unread: 0,
            messages: prev?.messages || [],
          }
        })
      } catch (e: unknown) {
        this.errors.conversations = e instanceof Error ? e.message : 'Errore caricamento conversazioni'
      } finally {
        this.loading.conversations = false
      }
    },

    async loadMessages(phone: string) {
      this.loading.messages = true
      this.errors.messages = null
      try {
        const { data, error } = await supabase
          .from('wa_messages')
          .select('id, content, direction, timestamp, created_at, status')
          .eq('contact_phone', phone)
          .order('timestamp', { ascending: true, nullsFirst: false })
        if (error) throw new Error(error.message)
        this.messages[phone] = (data ?? []).map((m) => ({
          id: m.id,
          content: m.content || '',
          direction: m.direction as 'incoming' | 'outgoing',
          time: m.timestamp || m.created_at || '',
          created_at: m.timestamp || m.created_at || '',
          status: m.status as Message['status'],
        }))
      } catch (e: unknown) {
        this.errors.messages = e instanceof Error ? e.message : 'Errore caricamento messaggi'
      } finally {
        this.loading.messages = false
      }
    },

    async loadTemplates() {
      this.loading.templates = true
      try {
        const res = await listWaTemplates()
        if (res.status === 'ok') {
          this.templates = res.data.map((t) => ({
            id: t.id || '',
            name: t.name || '',
            category: t.category || 'Template',
            content: t.preview || '',
            variables: 0,
            language: t.language || 'it',
            components: t.components || [],
          }))
        }
      } catch {
      } finally {
        this.loading.templates = false
      }
    },

    async loadWaStatus() {
      this.loading.waStatus = true
      try {
        const res = await getWaPhoneNumbers()
        const num = res.data?.[0]
        this.waStatus = num?.status || ''
        this.waDisplayNumber = num?.display_phone_number || ''
        this.waVerifiedName = num?.verified_name || ''
        this.n8nConfigError = false
      } catch {
        this.n8nConfigError = true
      } finally {
        this.loading.waStatus = false
      }
    },

    // ── Messaging ─────────────────────────────────────────────────────────────

    async sendMessage(phone: string, text: string): Promise<WaSendResult> {
      const result = await sendWaMessage(phone, text)
      if (result.status === 'ok') {
        await supabase.from('wa_messages').insert({
          direction: 'outgoing',
          to_phone: phone,
          content: text,
          status: 'sent',
          wa_id: result.messageId || null,
          timestamp: new Date().toISOString(),
        })
      }
      return result
    },

    async sendTemplate(
      phone: string,
      templateName: string,
      languageCode: string,
      bodyParams: string[],
      previewContent?: string,
    ): Promise<WaSendResult> {
      const result = await sendWaTemplate({ to: phone, templateName, languageCode, bodyParams })
      if (result.status === 'ok') {
        await supabase.from('wa_messages').insert({
          direction: 'outgoing',
          to_phone: phone,
          content: previewContent || `[Template: ${templateName}]`,
          status: 'sent',
          wa_id: result.messageId || null,
          timestamp: new Date().toISOString(),
        })
      }
      return result
    },

    // ── Contact management ────────────────────────────────────────────────────

    async createContact(name: string, phone: string, tags?: string[], note?: string) {
      const { error } = await supabase
        .from('wa_contacts')
        .insert({ name, phone, tags: tags || [], notes: note || '' })
      if (error) throw new Error(error.message)
      await this.loadContacts()
      return { status: 'ok' }
    },

    async updateContact(id: string, name: string, phone: string, tags?: string[], note?: string) {
      const { error } = await supabase
        .from('wa_contacts')
        .update({ name, phone, tags: tags || [], notes: note || '' })
        .eq('id', id)
      if (error) throw new Error(error.message)
      await this.loadContacts()
      return { status: 'ok' }
    },

    // ── Bulk helpers ──────────────────────────────────────────────────────────

    toggleBulkPhone(phone: string) {
      const s = new Set(this.bulkSelectedPhones)
      if (s.has(phone)) s.delete(phone)
      else s.add(phone)
      this.bulkSelectedPhones = s
    },

    clearBulkSelection() {
      this.bulkSelectedPhones = new Set()
      this.bulkMessage = ''
    },
  },
})
