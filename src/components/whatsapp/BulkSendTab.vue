<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Contacts selection -->
      <div class="lg:col-span-8">
        <div class="card">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900">
              Invio Massivo <span class="text-gray-500 text-sm">({{ contactsTotal }})</span>
            </h2>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div class="relative w-full sm:w-72">
                <Search class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca contatti..."
                  class="input-field pl-10 w-full"
                  :value="searchQuery"
                  @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="flex items-center gap-3">
                <button class="btn-secondary" @click="emit('selectAll')">Seleziona pagina</button>
                <button class="btn-secondary" @click="emit('clearSelection')">Pulisci selezione</button>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seleziona</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefono</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tag</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="contact in pagedContacts" :key="contact.id">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      :disabled="!contact.phone"
                      :checked="isBulkSelected(contact.phone)"
                      @change="emit('toggleSelect', contact.phone)"
                    />
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{{ contact.name }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ contact.phone || '—' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{{ contact.tag }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Bulk send panel -->
      <div class="lg:col-span-4">
        <div class="card lg:sticky lg:top-4">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm text-gray-700">Selezionati: {{ bulkSelectedCount }} / {{ filteredCount }}</div>
            <div class="text-xs text-gray-500">Pagina {{ currentPage }} di {{ totalPages }}</div>
          </div>

          <div class="space-y-5">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-3">Messaggio Testo</h3>
              <div class="space-y-3">
                <textarea
                  :value="bulkMessage"
                  @input="emit('update:bulkMessage', ($event.target as HTMLTextAreaElement).value)"
                  class="input-field w-full resize-y min-h-[120px]"
                  rows="5"
                  placeholder="Scrivi un messaggio..."
                ></textarea>
                <button class="btn-primary w-full" :disabled="!canBulkSendText" @click="emit('sendText')">
                  Invia a selezionati
                </button>
              </div>
            </div>

            <div class="border-t border-slate-200 pt-5">
              <h3 class="text-lg font-semibold text-gray-900 mb-3">Template</h3>
              <div class="space-y-3">
                <select
                  class="input-field w-full"
                  :value="bulkSelectedTemplateId"
                  @change="emit('update:bulkSelectedTemplateId', ($event.target as HTMLSelectElement).value || null)"
                >
                  <option :value="null">Seleziona template</option>
                  <option v-for="t in templates" :key="t.id" :value="String(t.id)">{{ t.name }} ({{ t.language }})</option>
                </select>
                <button class="btn-secondary w-full" :disabled="!canBulkSendTemplate" @click="emit('sendTemplate')">
                  Invia template ai selezionati
                </button>
              </div>
            </div>

            <div v-if="bulkStatus" class="text-sm" :class="bulkStatusType === 'success' ? 'text-green-600' : bulkStatusType === 'error' ? 'text-red-600' : 'text-gray-600'">
              {{ bulkStatus }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import type { WhatsAppTemplate } from '@/types'

defineProps<{
  pagedContacts: any[]
  contactsTotal: number
  filteredCount: number
  currentPage: number
  totalPages: number
  bulkSelectedCount: number
  bulkMessage: string
  bulkStatus: string
  bulkStatusType: string
  templates: WhatsAppTemplate[]
  bulkSelectedTemplateId: string | null
  searchQuery: string
  canBulkSendText: boolean
  canBulkSendTemplate: boolean
  isBulkSelected: (phone: string) => boolean
}>()

const emit = defineEmits<{
  'toggleSelect': [phone: string]
  'selectAll': []
  'clearSelection': []
  'update:bulkMessage': [value: string]
  'update:searchQuery': [value: string]
  'update:bulkSelectedTemplateId': [value: string | null]
  'sendText': []
  'sendTemplate': []
}>()
</script>
