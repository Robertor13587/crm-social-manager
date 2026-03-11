<template>
  <div class="space-y-6">
    <!-- Filters -->
    <div class="card">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Cerca</label>
          <input
            :value="searchQuery"
            @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="Cerca per nome, telefono o tag..."
            class="input-field"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tag</label>
          <select :value="tagFilter" @change="emit('update:tagFilter', ($event.target as HTMLSelectElement).value)" class="input-field">
            <option value="">Tutti</option>
            <option v-for="tag in distinctTags" :key="tag" :value="tag">{{ tag }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Data creazione</label>
          <select :value="dateFilter" @change="emit('update:dateFilter', ($event.target as HTMLSelectElement).value)" class="input-field">
            <option value="">Tutte</option>
            <option value="today">Oggi</option>
            <option value="week">Questa settimana</option>
            <option value="month">Questo mese</option>
          </select>
        </div>
        <div class="flex items-end">
          <button @click="emit('clearFilters')" class="btn-secondary">Pulisci Filtri</button>
        </div>
      </div>
    </div>

    <!-- Contacts Table -->
    <div class="card">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-gray-900">
          Rubrica Contatti
          <span class="text-gray-500 text-sm">({{ contactsTotal }})</span>
        </h2>
      </div>

      <div class="overflow-x-auto rounded-2xl border border-slate-200/70">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50/70">
            <tr>
              <th class="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome</th>
              <th class="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Telefono</th>
              <th class="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tag</th>
              <th class="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ultimo Messaggio</th>
              <th class="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Azioni</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-slate-200">
            <tr v-for="contact in pagedContacts" :key="contact.id" class="hover:bg-slate-900/[0.03]">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center mr-3 border border-slate-200">
                    <User class="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ contact.name }}</div>
                    <div class="text-sm text-slate-500">{{ contact.notes }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{{ contact.phone }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {{ contact.tag }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ contact.lastMessage }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex items-center space-x-2">
                  <button class="text-slate-500 hover:text-slate-900" @click="emit('chat', contact)">
                    <MessageCircle class="w-4 h-4" />
                  </button>
                  <button class="text-emerald-600 hover:text-emerald-800" @click="emit('sendTemplate', contact)">
                    <Send class="w-4 h-4" />
                  </button>
                  <button class="text-slate-500 hover:text-slate-900" @click="emit('edit', contact)">
                    <Edit class="w-4 h-4" />
                  </button>
                  <button class="text-rose-600 hover:text-rose-800">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-4">
      <div class="text-sm text-gray-600">Pagina {{ currentPage }} di {{ totalPages }}</div>
      <div class="flex items-center space-x-2">
        <button class="btn-secondary" :disabled="currentPage <= 1" @click="emit('update:page', currentPage - 1)">Precedente</button>
        <button class="btn-secondary" :disabled="currentPage >= totalPages" @click="emit('update:page', currentPage + 1)">Successivo</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { User, MessageCircle, Send, Edit, Trash2 } from 'lucide-vue-next'

defineProps<{
  pagedContacts: any[]
  contactsTotal: number
  totalPages: number
  currentPage: number
  distinctTags: string[]
  searchQuery: string
  tagFilter: string
  dateFilter: string
}>()

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  'update:tagFilter': [value: string]
  'update:dateFilter': [value: string]
  'update:page': [page: number]
  'clearFilters': []
  'chat': [contact: any]
  'sendTemplate': [contact: any]
  'edit': [contact: any]
}>()
</script>
