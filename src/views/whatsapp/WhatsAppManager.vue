<template>
  <div class="space-y-6 wa-theme">
    <!-- Header -->
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Gestione WhatsApp</h1>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn-secondary wa-btn-secondary w-full sm:w-auto" @click="refreshAll">
          <RefreshCw class="w-4 h-4" />
          Aggiorna
        </button>
        <button class="btn-secondary wa-btn-secondary w-full sm:w-auto" @click="importPhoneContacts">
          Importa Rubrica
        </button>
        <div>
          <input ref="fileInput" type="file" class="hidden" accept=".csv,.xlsx,.xls,.vcf" @change="onFileSelected" />
          <button class="btn-secondary wa-btn-secondary w-full sm:w-auto" @click="triggerFileImport">
            Importa da File
          </button>
        </div>
        <button class="btn-primary wa-btn-primary w-full sm:w-auto" @click="showAddContact = true">
          <Plus class="w-4 h-4" />
          Nuovo Contatto
        </button>
      </div>
    </div>

    <!-- Stats cards -->
    <WhatsAppStatsCards
      :total-messages="waTotalMessages"
      :contacts-total="contactsTotal"
      :conversations-count="conversationsCount"
      :messages-today="waMessagesToday"
    />

    <!-- Tab navigation -->
    <div class="sticky top-[72px] z-20">
      <nav class="card p-2 flex gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="px-3 py-2 rounded-xl text-sm font-semibold transition"
          :class="activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-900/5'"
        >
          {{ tab.label }}
          <span v-if="tab.count" class="ml-1 text-xs opacity-70">({{ tab.count }})</span>
        </button>
      </nav>
    </div>

    <!-- Contacts tab -->
    <ContactsTab
      v-if="activeTab === 'contacts'"
      :paged-contacts="pagedContacts"
      :contacts-total="contactsTotal"
      :total-pages="totalPages"
      :current-page="currentPage"
      :distinct-tags="distinctTags"
      :search-query="searchQuery"
      :tag-filter="tagFilter"
      :date-filter="dateFilter"
      @update:searchQuery="searchQuery = $event"
      @update:tagFilter="tagFilter = $event"
      @update:dateFilter="dateFilter = $event"
      @update:page="currentPage = $event"
      @clearFilters="clearFilters"
      @chat="startChat"
      @sendTemplate="openTemplateForContact"
      @edit="startEdit"
    />

    <!-- Messages tab -->
    <MessagesTab
      v-if="activeTab === 'messages'"
      :conversations="conversations"
      :selected-conversation="selectedConversation"
      :new-message="newMessage"
      :send-status="sendStatus"
      :send-status-type="sendStatusType"
      :templates="templates"
      :selected-template-id="selectedTemplateId"
      @selectConversation="selectConversation"
      @update:newMessage="newMessage = $event"
      @update:selectedTemplateId="selectedTemplateId = $event"
      @sendMessage="sendMessage"
      @sendSelectedTemplate="sendSelectedTemplate"
    />

    <!-- Bulk send tab -->
    <BulkSendTab
      v-if="activeTab === 'bulk'"
      :paged-contacts="pagedContacts"
      :contacts-total="contactsTotal"
      :filtered-count="filteredContacts.length"
      :current-page="currentPage"
      :total-pages="totalPages"
      :bulk-selected-count="bulkSelectedCount"
      :bulk-message="bulkMessage"
      :bulk-status="bulkStatus"
      :bulk-status-type="bulkStatusType"
      :templates="templates"
      :bulk-selected-template-id="bulkSelectedTemplateId"
      :search-query="searchQuery"
      :can-bulk-send-text="canBulkSendText"
      :can-bulk-send-template="canBulkSendTemplate"
      :is-bulk-selected="isBulkSelected"
      @toggleSelect="toggleBulkSelect"
      @selectAll="bulkSelectAllPage(pagedContacts)"
      @clearSelection="bulkClearSelection"
      @update:bulkMessage="bulkMessage = $event"
      @update:searchQuery="searchQuery = $event"
      @update:bulkSelectedTemplateId="bulkSelectedTemplateId = $event"
      @sendText="bulkSendText"
      @sendTemplate="bulkSendTemplate"
    />

    <!-- Templates tab -->
    <TemplatesTab
      v-if="activeTab === 'templates'"
      :templates="templates"
      @openTemplate="openTemplateModal"
      @reload="loadTemplates"
    />

    <!-- Template modal -->
    <TemplateModal
      :visible="showTemplateModal"
      :template="selectedTemplate"
      :variables="templateVariables"
      @update:variables="templateVariables = $event"
      @send="sendTemplateToConversation"
      @close="showTemplateModal = false"
    />

    <!-- Contact form modal (create / edit) -->
    <ContactFormModal
      v-if="showAddContact"
      :visible="showAddContact"
      mode="create"
      :contact-data="newContact"
      @save="handleCreateContact"
      @close="showAddContact = false"
    />
    <ContactFormModal
      v-if="showEditContact"
      :visible="showEditContact"
      mode="edit"
      :contact-data="editContactData"
      @save="handleUpdateContact"
      @close="showEditContact = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useWhatsAppStore } from '@/stores'
import { usePoll } from '@/composables/usePoll'
import { useWhatsAppContacts } from '@/composables/useWhatsAppContacts'
import { useWhatsAppMessaging } from '@/composables/useWhatsAppMessaging'
import { useWhatsAppTemplates } from '@/composables/useWhatsAppTemplates'
import { useWhatsAppBulkSend } from '@/composables/useWhatsAppBulkSend'
import { useWhatsAppFileImport } from '@/composables/useWhatsAppFileImport'
import { RefreshCw, Plus } from 'lucide-vue-next'

// Components
import WhatsAppStatsCards from '@/components/whatsapp/WhatsAppStatsCards.vue'
import ContactsTab from '@/components/whatsapp/ContactsTab.vue'
import MessagesTab from '@/components/whatsapp/MessagesTab.vue'
import BulkSendTab from '@/components/whatsapp/BulkSendTab.vue'
import TemplatesTab from '@/components/whatsapp/TemplatesTab.vue'
import TemplateModal from '@/components/whatsapp/TemplateModal.vue'
import ContactFormModal from '@/components/whatsapp/ContactFormModal.vue'

// Store
const waStore = useWhatsAppStore()
const { activeTab, selectedConversation, conversations, templates, waStatus, waDisplayNumber, waVerifiedName, bulkMessage } = storeToRefs(waStore)

// Composables
const {
  searchQuery, tagFilter, dateFilter, currentPage,
  showAddContact, showEditContact, newContact, editContactData,
  allContacts, filteredContacts, pagedContacts, totalPages, contactsTotal, distinctTags,
  loadContacts, loadSheetContacts, clearFilters, startEdit, createContact, updateContact,
} = useWhatsAppContacts()

const {
  newMessage, sendStatus, sendStatusType, conversationsCount,
  convPoll, msgsPoll,
  loadPendingLocal, loadConversations, loadMessages,
  selectConversation, startChat, sendMessage, pushLocalMessage, ensureConversationInList,
} = useWhatsAppMessaging()

const {
  showTemplateModal, selectedTemplate, selectedTemplateId, templateVariables,
  loadTemplates, openTemplateModal, sendSelectedTemplate, extractPlaceholders,
  normalizePhone, normalizePhoneInput,
} = useWhatsAppTemplates()

const {
  bulkSelectedTemplateId, bulkStatus, bulkStatusType,
  bulkSelectedCount, canBulkSendText, canBulkSendTemplate,
  isBulkSelected, toggleBulkSelect, bulkSelectAllPage, bulkClearSelection,
  bulkSendText, bulkSendTemplate,
} = useWhatsAppBulkSend(allContacts)

const { fileInput, triggerFileImport, onFileSelected, importPhoneContacts } = useWhatsAppFileImport(refreshAll)

// Stats (loaded from store in future; kept as refs for now)
const waTotalMessages = ref(0)
const waMessagesToday = ref(0)

// Tab definitions
const tabs = computed(() => [
  { id: 'contacts' as const, label: 'Rubrica', count: contactsTotal.value },
  { id: 'messages' as const, label: 'Messaggi', count: 0 },
  { id: 'bulk' as const, label: 'Invio massivo', count: contactsTotal.value },
  { id: 'templates' as const, label: 'Template', count: 0 },
])


// WA status polling
const loadWaStatus = async () => {
  try {
    await waStore.loadWaStatus()
    if (!waStatus.value) waPoll.stop()
  } catch {
    waPoll.stop()
  }
}
const waPoll = usePoll(loadWaStatus, { interval: 30000, autoStart: false, immediate: false })

// Contact CRUD handlers: update local refs then delegate to composable
const handleCreateContact = async (data: any) => {
  Object.assign(newContact.value, data)
  await createContact(refreshAll)
}
const handleUpdateContact = async (data: any) => {
  Object.assign(editContactData.value, data)
  await updateContact(refreshAll)
}

// Cross-composable: open template for a contact from contacts tab
const openTemplateForContact = (contact: any) => {
  activeTab.value = 'messages'
  const conv = { id: String(contact.id), contact: contact.name, phone: contact.phone, lastMessage: '', time: '', unread: 0, messages: [] }
  selectedConversation.value = conv
  const approved = templates.value.find(t => t.components && t.name) || templates.value[0]
  if (approved) openTemplateModal(approved)
  setTimeout(async () => {
    await loadConversations()
    const real = conversations.value.find(c => c.phone === contact.phone)
    if (real) selectConversation(real)
  }, 0)
}

// Cross-composable: send template to current conversation
const sendTemplateToConversation = async () => {
  if (!selectedConversation.value || !selectedTemplate.value) return
  const phone = selectedConversation.value.phone ? normalizePhoneInput(selectedConversation.value.phone) : ''
  const keys = extractPlaceholders(selectedTemplate.value.content)
  const params = keys.map(k => templateVariables.value[k] || '')
  const result = await waStore.sendTemplate(phone, selectedTemplate.value.name, selectedTemplate.value.language || 'it', params, selectedTemplate.value.content)
  if (result.status !== 'ok') {
    sendStatus.value = 'Invio template fallito: ' + (result.error || 'errore')
    sendStatusType.value = 'error'
    return
  }
  pushLocalMessage(selectedConversation.value.id, selectedTemplate.value.content, 'outgoing')
  showTemplateModal.value = false
  sendStatus.value = 'Template inviato correttamente'
  sendStatusType.value = 'success'
  await loadMessages(selectedConversation.value.id)
}

// Global refresh
let refreshAllInFlight: Promise<void> | null = null
async function refreshAll() {
  if (refreshAllInFlight) return refreshAllInFlight
  refreshAllInFlight = (async () => {
    await loadWaStatus()
    await loadContacts()
    await loadSheetContacts()
    currentPage.value = 1
    await loadConversations()
    await loadTemplates()
  })().finally(() => { refreshAllInFlight = null })
  return refreshAllInFlight
}

onMounted(async () => {
  loadPendingLocal()
  await refreshAll()
  convPoll.start()
  msgsPoll.start()
  waPoll.start()

  // Handle URL parameters for deep-link / auto-test
  const params = new URLSearchParams(window.location.search)
  const targetPhone = params.get('phone') || ''
  const targetContact = params.get('contact') || ''
  const action = params.get('action') || ''
  const autoTest = params.get('autotest') === '1'
  const autoMessage = params.get('message') || ''

  if (action === 'edit') {
    activeTab.value = 'contacts'
  } else if (targetPhone || targetContact) {
    activeTab.value = 'messages'
  }

  if (autoTest && (targetPhone || targetContact)) {
    let conv = conversations.value.find(c => c.phone === targetPhone) ||
      conversations.value.find(c => c.contact === targetContact)
    if (!conv) {
      conv = { id: targetPhone || targetContact, contact: targetContact || targetPhone || 'Contatto', phone: targetPhone, lastMessage: '', time: '', unread: 0, messages: [] }
      ensureConversationInList(conv)
    }
    selectedConversation.value = conv
    if (autoMessage) {
      newMessage.value = autoMessage
      await sendMessage()
    }
  }
})
</script>

<style scoped>
.wa-btn-primary {
  @apply bg-emerald-600 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/20;
}
.wa-btn-secondary {
  @apply border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 focus:ring-4 focus:ring-emerald-500/15;
}
</style>
