<template>
  <div>
    <div v-if="isMobileOpen" class="fixed inset-0 z-40 bg-black/30 lg:hidden" @click="closeSidebar"></div>
    <div
      class="fixed left-0 top-0 z-50 h-full w-64 max-w-[85vw] border-r border-slate-200/70 bg-white/70 backdrop-blur-xl transition-transform duration-200 lg:z-30 lg:translate-x-0"
      :class="isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
    >
      <div class="flex h-full flex-col p-4">
        <div class="flex items-start justify-between gap-2 px-2 pt-2">
          <div class="flex min-w-0 items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-600 shadow-sm shadow-primary-600/20">
            <MessageSquare class="h-6 w-6 text-white" />
          </div>
          <div class="min-w-0">
            <h2 class="truncate text-sm font-semibold tracking-tight text-slate-900">Social Manager</h2>
            <p class="truncate text-xs font-medium text-slate-600">Gestione Messaggi</p>
          </div>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10 lg:hidden"
            @click="closeSidebar"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <nav class="mt-6 flex-1 space-y-1 overflow-y-auto px-2" @click="onNavClick">
        <RouterLink
          to="/"
          class="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition"
          :class="navItemClass('/')"
        >
          <LayoutDashboard class="h-5 w-5 opacity-90" />
          <span class="truncate">Dashboard</span>
        </RouterLink>

        <div class="pt-4">
          <h3 class="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">WhatsApp</h3>
          <RouterLink
            to="/whatsapp"
            class="mt-2 group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition"
            :class="navItemClass('/whatsapp')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5">
              <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
            </svg>
            <span class="truncate">Gestione WhatsApp</span>
          </RouterLink>
        </div>
        
        <div class="pt-4">
          <h3 class="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Instagram</h3>
          <RouterLink
            to="/instagram"
            class="mt-2 group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition"
            :class="navItemClass('/instagram')"
          >
            <Instagram class="h-5 w-5 opacity-90" />
            <span class="truncate">Gestione Instagram</span>
          </RouterLink>
          <!-- <RouterLink
            to="/instagram/contacts"
            class="mt-1 group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition"
            :class="navItemClass('/instagram/contacts')"
          >
            <Users class="h-5 w-5 opacity-90" />
            <span class="truncate">Contatti Importati</span>
          </RouterLink> -->
        </div>
        <div class="pt-4">
          <h3 class="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Facebook</h3>
          <RouterLink
            to="/facebook"
            class="mt-2 group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition"
            :class="navItemClass('/facebook')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5">
              <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
            </svg>
            <span class="truncate">Gestione Facebook</span>
          </RouterLink>
        </div>

        <div class="pt-4">
          <h3 class="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Supporto</h3>
          <RouterLink
            to="/docs"
            class="mt-2 group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition"
            :class="navItemClass('/docs')"
          >
            <FileText class="h-5 w-5 opacity-90" />
            <span class="truncate">Documentazione</span>
          </RouterLink>
        </div>
      </nav>

      <div class="mt-4 px-2 pb-2">
        <a
          :href="metaOAuthHref"
          rel="noopener noreferrer"
          class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          @click="onMetaOAuthClickAndClose"
        >
          <img
            v-if="metaPage?.pictureUrl"
            :src="metaPage.pictureUrl"
            alt="Pagina"
            class="h-8 w-8 rounded-xl object-cover border border-slate-200 bg-slate-50"
          />
          <div v-else class="h-8 w-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-slate-600">
              <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
            </svg>
          </div>
          <span v-if="!metaPage">{{ isConnecting ? 'Collegamento in corso...' : 'Collega account Meta' }}</span>
          <span v-else class="flex min-w-0 items-center gap-2">
            <span class="truncate">{{ metaPage.name }}</span>
            <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
        </a>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { 
  LayoutDashboard, 
  Instagram, 
  FileText, 
  MessageSquare,
  X
} from 'lucide-vue-next'
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { apiBase, isMetaOAuthInProgress } from '@/utils/api'
import { getFbPage, getIgProfile } from '@/services/metaApiService'

const props = defineProps<{ open?: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const metaPage = ref<{ id: string; name: string; pictureUrl?: string } | null>(null)
const metaOAuthStartedAt = ref<number | null>(null)
const isConnecting = computed(() => {
  const startedAt = metaOAuthStartedAt.value
  if (typeof startedAt !== 'number' || !Number.isFinite(startedAt)) return false
  return Date.now() - startedAt < 20 * 60 * 1000
})

const route = useRoute()
const isMobileOpen = computed(() => Boolean(props.open))

const closeSidebar = () => {
  emit('close')
}

const navItemClass = (path: string) => {
  const active = route.path === path
  return active
    ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
    : 'text-slate-700 hover:bg-slate-900/5'
}

const onMetaOAuthClick = () => {
  try {
    const startedAt = Date.now()
    localStorage.setItem('postOAuthRedirect', route.fullPath)
    localStorage.setItem('metaOAuthStartAt', String(startedAt))
    metaOAuthStartedAt.value = startedAt
    sessionStorage.removeItem('metaLinked')
    window.dispatchEvent(new CustomEvent('meta:unlinked'))
    void loadMetaPage(true)
  } catch {}
}

const onMetaOAuthClickAndClose = () => {
  onMetaOAuthClick()
  closeSidebar()
}

const onNavClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement | null
  if (!target) return
  const anchor = target.closest('a')
  if (!anchor) return
  closeSidebar()
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

const extractFacebookPage = (j: any) => {
  const page = j?.page || j?.data?.page || j?.result?.page || j?.data || j?.result || null
  if (!page) return null
  const id = String(page?.id ?? page?.page_id ?? page?.pageId ?? '').trim()
  const name = String(page?.name ?? page?.page_name ?? page?.pageName ?? '').trim()
  const pictureUrl =
    page?.picture?.data?.url ??
    page?.picture?.url ??
    page?.picture_url ??
    page?.pictureUrl ??
    page?.profile_picture_url ??
    page?.profilePictureUrl
  if (!id && !name) return null
  return { id: id || name, name: name || id, pictureUrl: pictureUrl ? String(pictureUrl) : undefined }
}

const extractInstagramAccount = (j: any) => {
  const profile = j?.profile || j?.account || j?.data?.profile || j?.data?.account || j?.result?.profile || j?.result?.account || j?.data || j?.result || null
  if (!profile) return null
  const id = String(profile?.id ?? profile?.ig_id ?? profile?.user_id ?? profile?.userId ?? '').trim()
  const name = String(profile?.name ?? profile?.username ?? profile?.page_name ?? '').trim()
  const pictureUrl =
    profile?.profile_picture_url ??
    profile?.profilePictureUrl ??
    profile?.picture_url ??
    profile?.pictureUrl ??
    profile?.picture?.data?.url ??
    profile?.picture?.url
  if (!id && !name) return null
  return { id: id || name, name: name || id, pictureUrl: pictureUrl ? String(pictureUrl) : undefined }
}

const metaLinkedDispatched = ref(false)
const onUnlinked = () => {
  metaPage.value = null
  metaLinkedDispatched.value = false
}

const onLinked = () => {
  void loadMetaPage(true)
}

let metaLoadPromise: Promise<void> | null = null
let metaLoadRunId = 0
let metaLoadController: AbortController | null = null
let lastMetaLoadAt = 0
let storageHandler: ((e: StorageEvent) => void) | null = null
let focusHandler: (() => void) | null = null
let visibilityHandler: (() => void) | null = null

const loadMetaPageOnce = async () => {
  try {
    const [fbResult, igResult] = await Promise.allSettled([getFbPage(), getIgProfile()])
    if (fbResult.status === 'fulfilled') {
      const p = fbResult.value
      return {
        id: p.id,
        name: p.name || '',
        pictureUrl: p.picture?.url ? String(p.picture.url) : undefined
      }
    }
    if (igResult.status === 'fulfilled') {
      const p = igResult.value
      return {
        id: p.id,
        name: p.username || p.name || '',
        pictureUrl: p.profile_picture_url ? String(p.profile_picture_url) : undefined
      }
    }
    return null
  } catch {
    return null
  }
}

const loadMetaPage = async (force: boolean = false) => {
  const now = Date.now()
  if (!force && metaPage.value && now - lastMetaLoadAt < 2 * 60 * 1000 && !isMetaOAuthInProgress()) return
  if (metaLoadPromise) return metaLoadPromise

  metaLoadRunId += 1
  const runId = metaLoadRunId

  try {
    metaLoadController?.abort()
  } catch {}
  metaLoadController = new AbortController()
  const signal = metaLoadController.signal

  metaLoadPromise = (async () => {
  const startedAtRaw = (() => {
    try {
      return localStorage.getItem('metaOAuthStartAt')
    } catch {
      return null
    }
  })()
  const startedAt = startedAtRaw ? Number(startedAtRaw) : NaN
  const alreadyLinked = (() => {
    try {
      return sessionStorage.getItem('metaLinked') === '1'
    } catch {
      return false
    }
  })()
  const shouldRetry = Number.isFinite(startedAt) ? Date.now() - startedAt < 20 * 60 * 1000 : alreadyLinked

  const first = await loadMetaPageOnce()
  metaPage.value = first
  lastMetaLoadAt = Date.now()
  if (metaPage.value) {
    try {
      localStorage.removeItem('metaOAuthStartAt')
    } catch {}
    if (!alreadyLinked) {
      try {
        sessionStorage.setItem('metaLinked', '1')
      } catch {}
    }
    if (!alreadyLinked && !metaLinkedDispatched.value) {
      metaLinkedDispatched.value = true
      window.dispatchEvent(new CustomEvent('meta:linked'))
    }
    return
  }
  metaLinkedDispatched.value = false

  if (!shouldRetry) return

  for (let i = 0; i < 40; i++) {
    if (runId !== metaLoadRunId) return
    if (signal.aborted) return
    await new Promise((r) => setTimeout(r, 1500))
    if (runId !== metaLoadRunId) return
    if (signal.aborted) return
    const next = await loadMetaPageOnce()
    metaPage.value = next
    lastMetaLoadAt = Date.now()
    if (metaPage.value) {
      try {
        localStorage.removeItem('metaOAuthStartAt')
      } catch {}
      if (!alreadyLinked) {
        try {
          sessionStorage.setItem('metaLinked', '1')
        } catch {}
      }
      if (!alreadyLinked && !metaLinkedDispatched.value) {
        metaLinkedDispatched.value = true
        window.dispatchEvent(new CustomEvent('meta:linked'))
      }
      return
    }
    metaLinkedDispatched.value = false
  }

  // Tutti i retry esauriti senza successo: pulisce lo stato "collegamento in corso"
  // così la sidebar non rimane bloccata per 20 minuti
  try { localStorage.removeItem('metaOAuthStartAt') } catch {}
  metaOAuthStartedAt.value = null

  })().finally(() => {
    if (runId === metaLoadRunId) {
      metaLoadPromise = null
      metaLoadController = null
    }
  })

  return metaLoadPromise
}

watch(() => route.fullPath, () => { if (isMobileOpen.value) closeSidebar() })

onMounted(() => {
  try {
    const startedAtRaw = localStorage.getItem('metaOAuthStartAt')
    metaOAuthStartedAt.value = startedAtRaw ? Number(startedAtRaw) : null
  } catch {
    metaOAuthStartedAt.value = null
  }

  storageHandler = (e: StorageEvent) => {
    if (e.key === 'metaOAuthStartAt') {
      metaOAuthStartedAt.value = e.newValue ? Number(e.newValue) : null
      void loadMetaPage(true)
      return
    }
    if (e.key === 'postOAuthRedirect') {
      void loadMetaPage(true)
    }
  }

  window.addEventListener('meta:unlinked', onUnlinked as any)
  window.addEventListener('meta:linked', onLinked as any)
  window.addEventListener('storage', storageHandler)
  focusHandler = () => {
    if (isMetaOAuthInProgress()) void loadMetaPage(true)
  }
  visibilityHandler = () => {
    if (document.visibilityState === 'visible' && isMetaOAuthInProgress()) void loadMetaPage(true)
  }
  window.addEventListener('focus', focusHandler)
  document.addEventListener('visibilitychange', visibilityHandler)
  void loadMetaPage()
})

onUnmounted(() => {
  metaLoadRunId += 1
  try {
    metaLoadController?.abort()
  } catch {}
  metaLoadPromise = null
  metaLoadController = null
  window.removeEventListener('meta:unlinked', onUnlinked as any)
  window.removeEventListener('meta:linked', onLinked as any)
  if (storageHandler) window.removeEventListener('storage', storageHandler)
  storageHandler = null
  if (focusHandler) window.removeEventListener('focus', focusHandler)
  focusHandler = null
  if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
  visibilityHandler = null
})
</script>
