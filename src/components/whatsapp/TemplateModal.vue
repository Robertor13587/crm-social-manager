<template>
  <div v-if="visible" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div class="card max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold text-slate-900 mb-4">Invia Template: {{ template?.name }}</h3>
      <div class="space-y-4">
        <div v-for="(value, key) in variables" :key="key">
          <label class="block text-sm font-medium text-gray-700 mb-2">{{ key }}</label>
          <input
            :value="value"
            @input="emit('update:variables', { ...variables, [key]: ($event.target as HTMLInputElement).value })"
            type="text"
            class="input-field"
          />
        </div>
      </div>
      <div class="flex justify-end space-x-3 mt-6">
        <button @click="emit('close')" class="btn-secondary">Annulla</button>
        <button @click="emit('send')" class="btn-primary">Invia</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  template: any | null
  variables: Record<string, string>
}>()

const emit = defineEmits<{
  'update:variables': [vars: Record<string, string>]
  'send': []
  'close': []
}>()
</script>
