<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-slate-900">Template WhatsApp</h2>
      <button class="btn-primary">
        <Plus class="w-4 h-4" />
        Nuovo Template
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="template in templates" :key="template.id" class="card card-hover">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-slate-900">{{ template.name }}</h3>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900/5 text-slate-700 border border-slate-200">
            {{ template.category }}
          </span>
        </div>
        <p class="text-slate-600 mb-4">{{ template.content }}</p>
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">{{ template.variables }} variabili</span>
          <div class="flex items-center space-x-2">
            <button class="text-slate-500 hover:text-slate-900"><Edit class="w-4 h-4" /></button>
            <button class="text-emerald-600 hover:text-emerald-800" @click="emit('openTemplate', template)">
              <Send class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="templates.length === 0" class="card">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold text-gray-900">Nessun template disponibile</h3>
      </div>
      <p class="text-gray-600 mb-4">Per caricare i modelli approvati collega le credenziali WhatsApp Business nelle Impostazioni, oppure usa i template locali.</p>
      <div class="flex items-center space-x-3">
        <button class="btn-primary" @click="emit('reload')">
          <RefreshCw class="w-4 h-4" />
          Ricarica Template
        </button>
        <a href="/settings" class="btn-secondary">Apri Impostazioni</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Edit, Send, RefreshCw } from 'lucide-vue-next'
import type { WhatsAppTemplate } from '@/types'

defineProps<{
  templates: WhatsAppTemplate[]
}>()

const emit = defineEmits<{
  'openTemplate': [template: WhatsAppTemplate]
  'reload': []
}>()
</script>
