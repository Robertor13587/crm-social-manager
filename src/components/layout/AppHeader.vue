<template>
  <div class="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
    <div class="flex items-center justify-between">
      <div class="flex min-w-0 items-center gap-3 sm:gap-4">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10 lg:hidden"
          @click="toggleSidebar"
        >
          <Menu class="h-5 w-5" />
        </button>
        <h1 class="min-w-0 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-xl">IRK Promotion</h1>
        <div class="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold md:inline-flex">
          <span :class="['h-2 w-2 rounded-full', n8nOnline ? 'bg-emerald-500' : 'bg-rose-500']"></span>
          <span :class="n8nOnline ? 'text-slate-700' : 'text-rose-700'">{{ n8nOnline ? 'Backend online' : 'Backend offline' }}</span>
          <span class="text-slate-300">·</span>
          <button class="text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-60" :disabled="n8nChecking" @click="checkN8n">
            {{ n8nChecking ? 'Verifica…' : 'Ricarica' }}
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2 sm:gap-4">
        <button class="btn-secondary" @click="emitRefresh">
          <RefreshCw class="w-4 h-4" />
          <span class="hidden sm:inline">Aggiorna</span>
        </button>
        <div class="relative" v-if="isLoggedIn">
          <button class="flex items-center gap-2 rounded-xl px-2 py-1 text-slate-700 hover:bg-slate-900/5 hover:text-slate-900" @click="toggleMenu">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white shadow-sm shadow-primary-600/20">
              {{ userInitials }}
            </div>
            <span class="hidden max-w-40 truncate sm:block">{{ userName }}</span>
            <ChevronDown class="w-4 h-4" />
          </button>
          <div v-if="showMenu" class="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card z-50">
            <RouterLink to="/profile" class="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Profilo</RouterLink>
            <button class="block w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="logout">Esci</button>
          </div>
        </div>
        <RouterLink v-else to="/login" class="btn-primary">Accedi</RouterLink>
      </div>
    </div>
    <div v-if="false" class="mt-3 bg-yellow-50 border border-yellow-200 rounded-md p-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span class="text-sm text-yellow-800">Sessione demo attiva</span>
        </div>
        <div class="flex items-center space-x-2">
          <button class="btn-secondary" :disabled="backendChecking" @click="verifyAndPromote">
            {{ backendChecking ? 'Verifica in corso…' : 'Verifica backend' }}
          </button>
        </div>
      </div>
      <div v-if="showPromoteForm" class="mt-3 flex items-center space-x-2">
        <input v-model="promotePassword" type="password" placeholder="Password" class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button class="btn-primary" :disabled="backendChecking || !promotePassword" @click="createAndLogin">Crea e accedi</button>
        <span v-if="promoteError" class="text-sm text-red-600">{{ promoteError }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RefreshCw, ChevronDown, Menu } from 'lucide-vue-next'
import { useN8nHealth } from '@/composables/useN8nHealth'
import { authStorage } from '@/services/authStorage'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{ (e: 'toggleSidebar'): void }>()

const showMenu = ref(false)
const toggleMenu = () => { showMenu.value = !showMenu.value }

const isLoggedIn = computed(() => authStorage.hasToken())
const userName = computed(() => {
  const user = authStorage.getUser()
  return user?.name || user?.email || 'Utente'
})
const userInitials = computed(() => {
  const name = userName.value
  const parts = String(name).trim().split(' ')
  const first = parts[0]?.[0] || 'U'
  const second = parts[1]?.[0] || ''
  return (first + second).toUpperCase()
})

const emitRefresh = () => {
  window.dispatchEvent(new CustomEvent('app:refresh'))
}

const toggleSidebar = () => {
  emit('toggleSidebar')
}

const authStore = useAuthStore()

const logout = async () => {
  showMenu.value = false
  await authStore.logout()
  location.href = (import.meta.env.BASE_URL || '/') + 'login'
}

const backendChecking = ref(false)
const showPromoteForm = ref(false)
const promotePassword = ref('')
const promoteError = ref('')

const { n8nOnline, n8nChecking, checkN8n } = useN8nHealth()

const verifyAndPromote = async () => {
  promoteError.value = 'Funzionalità non disponibile (autenticazione gestita da Supabase)'
}

const createAndLogin = async () => {
  promoteError.value = 'Funzionalità non disponibile (autenticazione gestita da Supabase)'
}
</script>
