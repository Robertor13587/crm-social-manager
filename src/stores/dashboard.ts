import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { listIgConversations, getFbPage, getIgProfile, listFbConversations } from '@/services/metaApiService'
import type { FacebookPage, InstagramProfile } from '@/types'

interface KPI {
  total_messages: number
  inbound_messages: number
  outbound_messages: number
}

interface PlatformStat {
  total_messages: number
  active_conversations: number
  loading: boolean
  error: boolean
  loaded: boolean
}

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    kpi: { total_messages: 0, inbound_messages: 0, outbound_messages: 0 } as KPI,
    kpiPrev: { total_messages: 0, inbound_messages: 0, outbound_messages: 0 } as KPI,
    wa: { total_messages: 0, active_conversations: 0, loading: false, error: false, loaded: false } as PlatformStat,
    ig: { total_messages: 0, active_conversations: 0, loading: false, error: false, loaded: false } as PlatformStat,
    fb: { total_messages: 0, active_conversations: 0, loading: false, error: false, loaded: false } as PlatformStat,
    socialStats: {
      fb: null as FacebookPage | null,
      ig: null as InstagramProfile | null,
    },
    lastRefresh: null as Date | null,
    overviewError: false,
  }),

  getters: {
    kpiDelta: (state) => {
      const delta = (curr: number, prev: number) => {
        if (!prev) return null
        return Math.round(((curr - prev) / prev) * 100)
      }
      return {
        total: delta(state.kpi.total_messages, state.kpiPrev.total_messages),
        inbound: delta(state.kpi.inbound_messages, state.kpiPrev.inbound_messages),
        outbound: delta(state.kpi.outbound_messages, state.kpiPrev.outbound_messages),
      }
    },
  },

  actions: {
    async loadAll() {
      this.overviewError = false
      await Promise.allSettled([
        this.loadWaStats(),
        this.loadIgStats(),
        this.loadFbStats(),
        this.loadSocialStats(),
      ])
      this.lastRefresh = new Date()
    },

    async loadWaStats() {
      this.wa.loading = true
      this.wa.error = false
      try {
        const [
          { count: total },
          { count: active },
          { count: inbound },
        ] = await Promise.all([
          supabase.from('wa_messages').select('*', { count: 'exact', head: true }),
          supabase.from('wa_conversations_view').select('*', { count: 'exact', head: true }),
          supabase.from('wa_messages').select('*', { count: 'exact', head: true }).eq('direction', 'incoming'),
        ])
        this.wa.total_messages = total ?? 0
        this.wa.active_conversations = active ?? 0
        this.kpi.total_messages += total ?? 0
        this.kpi.inbound_messages += inbound ?? 0
        this.kpi.outbound_messages += (total ?? 0) - (inbound ?? 0)
        this.wa.loaded = true
      } catch {
        this.wa.error = true
      } finally {
        this.wa.loading = false
      }
    },

    async loadIgStats() {
      this.ig.loading = true
      this.ig.error = false
      try {
        const res = await listIgConversations(5)
        this.ig.active_conversations = res.data.length
        this.ig.total_messages = res.data.length
        this.ig.loaded = true
      } catch {
        this.ig.error = true
      } finally {
        this.ig.loading = false
      }
    },

    async loadFbStats() {
      this.fb.loading = true
      this.fb.error = false
      try {
        const convs = await listFbConversations()
        this.fb.active_conversations = convs.length
        this.fb.total_messages = convs.length
        this.fb.loaded = true
      } catch {
        this.fb.error = true
      } finally {
        this.fb.loading = false
      }
    },

    async loadSocialStats() {
      const [fbRes, igRes] = await Promise.allSettled([getFbPage(), getIgProfile()])

      if (fbRes.status === 'fulfilled') {
        const p = fbRes.value
        if (p?.id) {
          this.socialStats.fb = {
            id: p.id,
            name: p.name || '',
            fanCount: p.fan_count || 0,
            followersCount: p.followers_count || 0,
            pictureUrl: p.picture?.url || null,
          }
        }
      }

      if (igRes.status === 'fulfilled') {
        const p = igRes.value
        if (p?.id) {
          this.socialStats.ig = {
            id: p.id,
            username: p.username || '',
            name: p.name || '',
            biography: p.biography || '',
            profilePictureUrl: p.profile_picture_url || null,
            followersCount: p.followers_count || 0,
            followsCount: p.follows_count || 0,
            mediaCount: p.media_count || 0,
          }
        }
      }
    },

    resetKpi() {
      this.kpi = { total_messages: 0, inbound_messages: 0, outbound_messages: 0 }
    },
  },
})
