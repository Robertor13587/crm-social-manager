<template>
  <slot v-if="!hasError" />
  <div v-else class="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
    <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
      <AlertTriangle class="h-6 w-6 text-red-500" />
    </div>
    <h3 class="mb-1 text-base font-semibold text-red-800">Si è verificato un errore</h3>
    <p class="mb-4 max-w-xs text-sm text-red-600">
      {{ friendlyMessage }}
    </p>
    <button
      class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      @click="reset"
    >
      Riprova
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onErrorCaptured } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'

interface Props {
  /** Messaggio personalizzato mostrato all'utente */
  message?: string
  /** Se true, logga l'errore in console (utile in sviluppo) */
  logError?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  message: undefined,
  logError: true,
})

const emit = defineEmits<{
  (e: 'error', err: unknown, info: string): void
}>()

const hasError = ref(false)
const capturedError = ref<unknown>(null)

const friendlyMessage = computed(() => {
  if (props.message) return props.message
  return 'Un componente della pagina ha smesso di funzionare. Clicca "Riprova" per ricaricare questa sezione.'
})

const reset = () => {
  hasError.value = false
  capturedError.value = null
}

onErrorCaptured((err, instance, info) => {
  hasError.value = true
  capturedError.value = err

  if (props.logError) {
    console.error('[ErrorBoundary] Errore catturato:', err, '\nInfo:', info, '\nComponente:', instance)
  }

  emit('error', err, info)

  // Blocca la propagazione dell'errore al componente padre
  return false
})
</script>
