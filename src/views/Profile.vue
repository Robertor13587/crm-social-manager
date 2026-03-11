<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Profilo Utente</h1>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Dettagli</h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Nome</span>
            <span class="font-medium">{{ user?.name || '—' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Email</span>
            <span class="font-medium">{{ user?.email || '—' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Ruolo</span>
            <span class="font-medium capitalize">{{ user?.role || '—' }}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Cambia Password</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Password attuale</label>
            <input v-model="currentPassword" type="password" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Nuova password</label>
            <input v-model="newPassword" type="password" class="input-field" />
          </div>
          <div class="flex items-center justify-end">
            <button class="btn-primary disabled:opacity-60 disabled:cursor-not-allowed" :disabled="!user" @click="changePassword">Aggiorna</button>
          </div>
          <p v-if="!user" class="text-sm text-gray-500">Sessione non disponibile. Effettua nuovamente il login per cambiare password.</p>
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
          <p v-if="success" class="text-sm text-green-600">{{ success }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores'

const authStore = useAuthStore()
const user = authStore.user

const currentPassword = ref('')
const newPassword = ref('')
const error = ref('')
const success = ref('')

const changePassword = async () => {
  error.value   = ''
  success.value = ''
  if (!currentPassword.value || !newPassword.value) {
    error.value = 'Inserisci entrambe le password'
    return
  }
  if (newPassword.value.length < 8) {
    error.value = 'La nuova password deve essere di almeno 8 caratteri'
    return
  }
  try {
    await authStore.changePassword(currentPassword.value, newPassword.value)
    success.value         = 'Password aggiornata con successo'
    currentPassword.value = ''
    newPassword.value     = ''
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Errore aggiornamento password'
  }
}
</script>
