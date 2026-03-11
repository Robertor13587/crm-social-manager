<template>
  <div class="min-h-screen flex bg-gray-950">
    <div class="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-600 via-indigo-600 to-slate-900 text-white">
      <div class="flex flex-col justify-center space-y-12 px-12 py-10 w-full">
        <div>
          <div class="inline-flex items-center space-x-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>CRM Social Manager</span>
          </div>
          <h2 class="mt-6 text-3xl font-semibold leading-tight">Gestione centralizzata dei messaggi</h2>
          <p class="mt-3 text-sm text-white/80">
            WhatsApp, Instagram e Facebook in un'unica interfaccia operativa pensata per il tuo team.
          </p>
        </div>
        <div class="flex flex-col items-center lg:items-start space-y-3 text-xs text-white/70">
          <div class="flex space-x-3">
            <div class="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5 text-green-400">
                <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
              </svg>
            </div>
            <div class="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5 text-pink-300">
                <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334"/>
              </svg>
            </div>
            <div class="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5 text-blue-300">
                <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
              </svg>
            </div>
          </div>
          <div class="text-center lg:text-left">Accesso riservato al personale autorizzato.</div>
        </div>
      </div>
    </div>
    <div class="flex-1 flex items-center justify-center px-6 py-10 bg-gray-50">
      <div class="w-full max-w-md">
        <div class="mb-8">
          <div class="inline-flex items-center space-x-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
            <span class="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
            <span>Area riservata</span>
          </div>
          <h1 class="mt-6 text-3xl font-bold tracking-tight text-gray-900">Accedi al pannello</h1>
          <p class="mt-2 text-sm text-gray-500">
            Usa le credenziali aziendali per entrare nel CRM Social Manager.
          </p>
        </div>
        <div class="mb-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs text-gray-600">
          <div class="font-semibold text-gray-700 mb-1">Accesso</div>
          <div class="flex flex-col gap-1">
            <div>Le credenziali vengono verificate sul database utenti.</div>
            <div>Se non le hai, contatta l'amministratore di sistema.</div>
          </div>
        </div>
        <form class="space-y-5" @submit.prevent="login">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              v-model="email"
              type="email"
              class="input-field"
              autocomplete="email"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              v-model="password"
              type="password"
              class="input-field"
              autocomplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            class="w-full btn-primary h-11 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="loading"
          >
            <span v-if="!loading">Accedi</span>
            <span v-else>Accesso in corso…</span>
          </button>
        </form>
        <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
        <p class="mt-6 text-xs text-gray-400">
          L'accesso e l'utilizzo della piattaforma sono monitorati per motivi di sicurezza.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'

const email    = ref('')
const password = ref('')
const error    = ref('')
const loading  = ref(false)
const router   = useRouter()
const authStore = useAuthStore()

const login = async () => {
  error.value   = ''
  loading.value = true
  try {
    await authStore.login(email.value, password.value)

    const postOAuthRedirect = authStore.getPostOAuthRedirect()
    if (postOAuthRedirect) {
      authStore.clearPostOAuthRedirect()
      router.replace(postOAuthRedirect)
      return
    }
    const postLoginRedirect = authStore.getPostLoginRedirect()
    if (postLoginRedirect) {
      authStore.clearPostLoginRedirect()
      router.replace(postLoginRedirect)
      return
    }
    router.replace({ name: 'dashboard' })
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Errore durante il login'
  } finally {
    loading.value = false
  }
}
</script>
