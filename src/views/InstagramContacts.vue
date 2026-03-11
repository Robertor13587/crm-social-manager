<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Contatti Importati</h1>
      <div class="flex flex-wrap gap-2">
        <button
          @click="showImportModal = true"
          class="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Upload class="h-4 w-4" />
          <span>Importa Excel</span>
        </button>
        <button
          @click="exportContacts"
          class="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <Download class="h-4 w-4" />
          <span>Esporta</span>
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 rounded-lg">
            <Users class="h-6 w-6 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Totale Contatti</p>
            <p class="text-2xl font-bold text-gray-900">{{ contacts.length }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 rounded-lg">
            <UserCheck class="h-6 w-6 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Contatti Attivi</p>
            <p class="text-2xl font-bold text-gray-900">{{ activeContacts }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-yellow-100 rounded-lg">
            <MessageSquare class="h-6 w-6 text-yellow-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Conversazioni</p>
            <p class="text-2xl font-bold text-gray-900">{{ totalConversations }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-purple-100 rounded-lg">
            <Calendar class="h-6 w-6 text-purple-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Importati Oggi</p>
            <p class="text-2xl font-bold text-gray-900">{{ importedToday }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Cerca</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cerca per nome o username..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Stato</label>
          <select
            v-model="statusFilter"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti</option>
            <option value="active">Attivo</option>
            <option value="inactive">Inattivo</option>
            <option value="blocked">Bloccato</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Data Importazione</label>
          <select
            v-model="dateFilter"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutte</option>
            <option value="today">Oggi</option>
            <option value="week">Questa settimana</option>
            <option value="month">Questo mese</option>
          </select>
        </div>
        
        <div class="flex items-end">
          <button
            @click="clearFilters"
            class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Pulisci Filtri
          </button>
        </div>
      </div>
    </div>

    <!-- Contacts Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  v-model="selectAll"
                  @change="toggleSelectAll"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                >
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Profilo
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Username
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Followers
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stato
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data Importazione
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="contact in filteredContacts" :key="contact.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  v-model="contact.selected"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                >
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Avatar 
                  :name="contact.name"
                  :src="contact.profilePicture"
                  :alt="contact.name"
                  size="md"
                />
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ contact.name }}</div>
                <div class="text-sm text-gray-500">{{ contact.biography?.substring(0, 30) }}...</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">@{{ contact.username }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ formatNumber(contact.followersCount) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="[
                  'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                  contact.status === 'active' ? 'bg-green-100 text-green-800' :
                  contact.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                ]">
                  {{ getStatusLabel(contact.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ formatDate(contact.importedAt) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button
                    @click="viewContact(contact)"
                    class="text-blue-600 hover:text-blue-900"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    @click="sendMessage(contact)"
                    class="text-green-600 hover:text-green-900"
                  >
                    <MessageSquare class="h-4 w-4" />
                  </button>
                  <button
                    @click="deleteContact(contact)"
                    class="text-red-600 hover:text-red-900"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div v-if="selectedContacts.length > 0" class="bg-white rounded-lg shadow p-4">
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-700">
          {{ selectedContacts.length }} contatti selezionati
        </span>
        <div class="flex space-x-2">
          <button
            @click="bulkSendMessage"
            class="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
          >
            Invia Messaggio
          </button>
          <button
            @click="bulkDelete"
            class="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
          >
            Elimina
          </button>
        </div>
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImportModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Importa Contatti da Excel</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">File Excel</label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref="fileInput"
                type="file"
                accept=".xlsx,.xls,.csv"
                @change="handleFileSelect"
                class="hidden"
              >
              <div v-if="!selectedFile">
                <FileSpreadsheet class="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p class="text-sm text-gray-500 mb-2">Trascina qui il tuo file Excel o</p>
                <button
                  @click="fileInput?.click()"
                  class="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  clicca per selezionare
                </button>
              </div>
              <div v-else>
                <FileSpreadsheet class="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p class="text-sm font-medium text-gray-900">{{ selectedFile.name }}</p>
                <p class="text-xs text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
                <button
                  @click="selectedFile = null"
                  class="text-red-600 hover:text-red-700 text-sm mt-2"
                >
                  Rimuovi file
                </button>
              </div>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Mappatura Colonne</label>
            <div class="text-xs text-gray-500 mb-2">
              Il file deve contenere le seguenti colonne:
            </div>
            <div class="bg-gray-50 rounded p-2 text-xs text-gray-600">
              <div>• username (obbligatorio)</div>
              <div>• name (opzionale)</div>
              <div>• biography (opzionale)</div>
              <div>• profilePicture (opzionale)</div>
            </div>
          </div>
          
          <div v-if="importPreview.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2">Anteprima ({{ importPreview.length }} contatti)</label>
            <div class="max-h-32 overflow-y-auto border rounded p-2">
              <div v-for="(contact, index) in importPreview.slice(0, 5)" :key="index" class="text-xs text-gray-600">
                {{ contact.username }} - {{ contact.name || 'N/A' }}
              </div>
              <div v-if="importPreview.length > 5" class="text-xs text-gray-500 mt-1">
                ... e altri {{ importPreview.length - 5 }} contatti
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3 mt-6">
          <button
            @click="showImportModal = false"
            class="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Annulla
          </button>
          <button
            @click="importContacts"
            :disabled="!selectedFile || importing"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {{ importing ? 'Importazione...' : 'Importa' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { Users, UserCheck, MessageSquare, Calendar, Upload, Download, Eye, Trash2, FileSpreadsheet } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import Avatar from '@/components/ui/Avatar.vue'

interface Contact {
  id: string
  username: string
  name?: string
  biography?: string
  profilePicture?: string
  followersCount: number
  followingCount: number
  mediaCount: number
  isPrivate: boolean
  isVerified: boolean
  status: 'active' | 'inactive' | 'blocked'
  importedAt: string
  lastInteraction?: string
  selected?: boolean
}

const { showToast } = useToast()

const contacts = ref<Contact[]>([])
const searchQuery = ref('')
const statusFilter = ref('')
const dateFilter = ref('')
const selectAll = ref(false)
const showImportModal = ref(false)
const selectedFile = ref<File | null>(null)
const importPreview = ref<any[]>([])
const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Mock data - in realtà verrebbe caricata dall'API
const mockContacts: Contact[] = [
  {
    id: '1',
    username: 'giovanni_rossi',
    name: 'Giovanni Rossi',
    biography: 'Fashion blogger & photographer 📸',
    profilePicture: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAyQzEzLjEgMiAxNCAyLjkgMTQgNEMxNCA1LjEgMTMuMSA2IDEyIDZDMTAuOSA2IDEwIDUuMSAxMCA0QzEwIDIuOSAxMC45IDIgMTIgMlpNMjEgOVYyMkgxNVYxNi41SDlWMjJIM1Y5QzMgOCA0IDcgNSA3SDE5QzIwIDcgMjEgOCAyMSA5Wk0xMiA3QzE0LjggNyAxNyA5LjIgMTcgMTJDMTcgMTQuOCAxNC44IDE3IDEyIDE3QzkuMiAxNyA3IDE0LjggNyAxMkM3IDkuMiA5LjIgNyAxMiA3WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPgo=',
    followersCount: 15420,
    followingCount: 892,
    mediaCount: 324,
    isPrivate: false,
    isVerified: false,
    status: 'active',
    importedAt: '2024-11-19T10:30:00Z',
    lastInteraction: '2024-11-18T15:20:00Z'
  },
  {
    id: '2',
    username: 'maria_bianchi',
    name: 'Maria Bianchi',
    biography: 'Travel enthusiast ✈️ | Food lover 🍝',
    profilePicture: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGRjc4N0MiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAyQzEzLjEgMiAxNCAyLjkgMTQgNEMxNCA1LjEgMTMuMSA2IDEyIDZDMTAuOSA2IDEwIDUuMSAxMCA0QzEwIDIuOSAxMC45IDIgMTIgMlpNMjEgOVYyMkgxNVYxNi41SDlWMjJIM1Y5QzMgOCA0IDcgNSA3SDE5QzIwIDcgMjEgOCAyMSA5Wk0xMiA3QzE0LjggNyAxNyA5LjIgMTcgMTJDMTcgMTQuOCAxNC44IDE3IDEyIDE3QzkuMiAxNyA3IDE0LjggNyAxMkM3IDkuMiA5LjIgNyAxMiA3WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPgo=',
    followersCount: 8930,
    followingCount: 1245,
    mediaCount: 189,
    isPrivate: false,
    isVerified: false,
    status: 'active',
    importedAt: '2024-11-19T09:15:00Z',
    lastInteraction: '2024-11-17T12:45:00Z'
  },
  {
    id: '3',
    username: 'luca_verdi',
    name: 'Luca Verdi',
    biography: 'Digital Marketing Expert 📈',
    profilePicture: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMxMGI5ODEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAyQzEzLjEgMiAxNCAyLjkgMTQgNEMxNCA1LjEgMTMuMSA2IDEyIDZDMTAuOSA2IDEwIDUuMSAxMCA0QzEwIDIuOSAxMC45IDIgMTIgMlpNMjEgOVYyMkgxNVYxNi41SDlWMjJIM1Y5QzMgOCA0IDcgNSA3SDE5QzIwIDcgMjEgOCAyMSA5Wk0xMiA3QzE0LjggNyAxNyA5LjIgMTcgMTJDMTcgMTQuOCAxNC44IDE3IDEyIDE3QzkuMiAxNyA3IDE0LjggNyAxMkM3IDkuMiA5LjIgNyAxMiA3WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPgo=',
    followersCount: 25600,
    followingCount: 456,
    mediaCount: 567,
    isPrivate: false,
    isVerified: true,
    status: 'active',
    importedAt: '2024-11-18T16:20:00Z',
    lastInteraction: '2024-11-16T18:30:00Z'
  },
  {
    id: '4',
    username: 'anna_ferrari',
    name: 'Anna Ferrari',
    biography: 'Fitness coach 💪 | Healthy lifestyle',
    profilePicture: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNmNTljMCIiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAyQzEzLjEgMiAxNCAyLjkgMTQgNEMxNCA1LjEgMTMuMSA2IDEyIDZDMTAuOSA2IDEwIDUuMSAxMCA0QzEwIDIuOSAxMC45IDIgMTIgMlpNMjEgOVYyMkgxNVYxNi41SDlWMjJIM1Y5QzMgOCA0IDcgNSA3SDE5QzIwIDcgMjEgOCAyMSA5Wk0xMiA3QzE0LjggNyAxNyA5LjIgMTcgMTJDMTcgMTQuOCAxNC44IDE3IDEyIDE3QzkuMiAxNyA3IDE0LjggNyAxMkM3IDkuMiA5LjIgNyAxMiA3WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPgo=',
    followersCount: 12450,
    followingCount: 678,
    mediaCount: 234,
    isPrivate: false,
    isVerified: false,
    status: 'inactive',
    importedAt: '2024-11-18T14:10:00Z',
    lastInteraction: '2024-11-15T09:15:00Z'
  },
  {
    id: '5',
    username: 'marco_galli',
    name: 'Marco Galli',
    biography: 'Tech enthusiast | Startup founder',
    profilePicture: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM4YjVjZjYiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAyQzEzLjEgMiAxNCAyLjkgMTQgNEMxNCA1LjEgMTMuMSA2IDEyIDZDMTAuOSA2IDEwIDUuMSAxMCA0QzEwIDIuOSAxMC45IDIgMTIgMlpNMjEgOVYyMkgxNVYxNi41SDlWMjJIM1Y5QzMgOCA0IDcgNSA3SDE5QzIwIDcgMjEgOCAyMSA5Wk0xMiA3QzE0LjggNyAxNyA5LjIgMTcgMTJDMTcgMTQuOCAxNC44IDE3IDEyIDE3QzkuMiAxNyA3IDE0LjggNyAxMkM3IDkuMiA5LjIgNyAxMiA3WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPgo=',
    followersCount: 6780,
    followingCount: 234,
    mediaCount: 145,
    isPrivate: false,
    isVerified: false,
    status: 'blocked',
    importedAt: '2024-11-17T11:45:00Z',
    lastInteraction: '2024-11-14T14:20:00Z'
  }
]

const filteredContacts = computed(() => {
  let filtered = contacts.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(contact => 
      contact.name?.toLowerCase().includes(query) ||
      contact.username.toLowerCase().includes(query) ||
      contact.biography?.toLowerCase().includes(query)
    )
  }

  if (statusFilter.value) {
    filtered = filtered.filter(contact => contact.status === statusFilter.value)
  }

  if (dateFilter.value) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    filtered = filtered.filter(contact => {
      const importedDate = new Date(contact.importedAt)
      
      switch (dateFilter.value) {
        case 'today':
          return importedDate >= today
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          return importedDate >= weekAgo
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          return importedDate >= monthAgo
        default:
          return true
      }
    })
  }

  return filtered
})

const selectedContacts = computed(() => 
  contacts.value.filter(contact => contact.selected)
)

const activeContacts = computed(() => 
  contacts.value.filter(contact => contact.status === 'active').length
)

const totalConversations = computed(() => 
  contacts.value.filter(contact => contact.lastInteraction).length
)

const importedToday = computed(() => {
  const today = new Date()
  const todayString = today.toISOString().split('T')[0]
  return contacts.value.filter(contact => 
    contact.importedAt.split('T')[0] === todayString
  ).length
})

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('it-IT')
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getStatusLabel = (status: string): string => {
  const labels = {
    active: 'Attivo',
    inactive: 'Inattivo',
    blocked: 'Bloccato'
  }
  return labels[status as keyof typeof labels] || status
}

const toggleSelectAll = () => {
  filteredContacts.value.forEach(contact => {
    contact.selected = selectAll.value
  })
}

const viewContact = (contact: Contact) => {
  // Navigate to contact detail or show modal
  showToast(`Visualizzazione dettagli per @${contact.username}`, 'info')
}

const sendMessage = (contact: Contact) => {
  // Navigate to Instagram DM with this contact
  showToast(`Apertura conversazione con @${contact.username}`, 'success')
  // In a real app, this would navigate to InstagramManager with pre-selected contact
}

const deleteContact = async (contact: Contact) => {
  if (confirm(`Sei sicuro di voler eliminare il contatto @${contact.username}?`)) {
    try {
      const { error } = await supabase.from('ig_contacts').delete().eq('id', contact.id)
      if (error) throw error
      contacts.value = contacts.value.filter(c => c.id !== contact.id)
      showToast('Contatto eliminato con successo', 'success')
    } catch {
      showToast('Errore nell\'eliminazione del contatto', 'error')
    }
  }
}

const bulkSendMessage = () => {
  const selectedUsernames = selectedContacts.value.map(c => c.username)
  showToast(`Invio messaggio a ${selectedUsernames.length} contatti selezionati`, 'info')
  // In a real app, this would open a bulk message composer
}

const bulkDelete = async () => {
  if (confirm(`Sei sicuro di voler eliminare ${selectedContacts.value.length} contatti?`)) {
    try {
      const ids = selectedContacts.value.map(c => c.id)
      const { error } = await supabase.from('ig_contacts').delete().in('id', ids)
      if (error) throw error
      contacts.value = contacts.value.filter(c => !c.selected)
      showToast('Contatti eliminati con successo', 'success')
    } catch {
      showToast('Errore nell\'eliminazione dei contatti', 'error')
    }
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  dateFilter.value = ''
}

const exportContacts = () => {
  const csvContent = [
    ['Username', 'Nome', 'Biografia', 'Followers', 'Following', 'Stato', 'Data Importazione'],
    ...filteredContacts.value.map(contact => [
      contact.username,
      contact.name || '',
      contact.biography || '',
      contact.followersCount.toString(),
      contact.followingCount.toString(),
      contact.status,
      formatDate(contact.importedAt)
    ])
  ].map(row => row.join(',')).join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `contatti_importati_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
  
  showToast('Contatti esportati con successo', 'success')
}

const handleFileSelect = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  selectedFile.value = file
  
  // Preview Excel content (in a real app, this would parse the Excel file)
  // For now, we'll simulate a preview
  importPreview.value = [
    { username: 'preview_user1', name: 'Preview User 1' },
    { username: 'preview_user2', name: 'Preview User 2' },
    { username: 'preview_user3', name: 'Preview User 3' }
  ]
}

const importContacts = async () => {
  if (!selectedFile.value || importPreview.value.length === 0) return

  importing.value = true
  try {
    const rows = importPreview.value.map((c: any) => ({
      username: String(c.username || '').trim(),
      name: c.name || null,
    })).filter(r => r.username)
    const { error } = await supabase.from('ig_contacts').insert(rows)
    if (error) throw error
    showToast(`Importati ${rows.length} contatti con successo`, 'success')
    showImportModal.value = false
    selectedFile.value = null
    importPreview.value = []
    await loadContacts()
  } catch {
    showToast('Errore nell\'importazione dei contatti', 'error')
  } finally {
    importing.value = false
  }
}

const loadContacts = async () => {
  try {
    const { data, error } = await supabase
      .from('ig_contacts')
      .select('id, username, name, biography, profile_picture, followers_count, following_count, media_count, is_private, is_verified, status, last_interaction, created_at')
      .order('username')
    if (error) throw error
    if (data && data.length > 0) {
      contacts.value = data.map((c: any) => ({
        id: String(c.id),
        username: String(c.username ?? ''),
        name: c.name ?? '',
        biography: c.biography ?? '',
        profilePicture: c.profile_picture ?? '',
        followersCount: Number(c.followers_count ?? 0),
        followingCount: Number(c.following_count ?? 0),
        mediaCount: Number(c.media_count ?? 0),
        isPrivate: Boolean(c.is_private ?? false),
        isVerified: Boolean(c.is_verified ?? false),
        status: (c.status ?? 'active') as any,
        importedAt: String(c.created_at ?? new Date().toISOString()),
        lastInteraction: c.last_interaction ?? '',
        selected: false
      }))
    } else {
      contacts.value = mockContacts.map(contact => ({ ...contact, selected: false }))
    }
  } catch {
    contacts.value = mockContacts.map(contact => ({ ...contact, selected: false }))
  }
}

onMounted(() => {
  loadContacts()
})
</script>
