<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Conversation List -->
      <div class="lg:col-span-1">
        <div class="card">
          <h3 class="text-lg font-semibold text-slate-900 mb-4">Conversazioni</h3>
          <div class="space-y-3">
            <div
              v-for="conversation in conversations"
              :key="conversation.id"
              @click="emit('selectConversation', conversation)"
              class="p-3 rounded-2xl cursor-pointer transition-colors border"
              :class="selectedConversation?.id === conversation.id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'hover:bg-slate-900/5 border-slate-200/70 text-slate-900'"
            >
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
                  <User class="w-5 h-5 text-slate-500" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold truncate">{{ conversation.contact }}</p>
                  <p class="text-sm opacity-75 truncate">{{ conversation.lastMessage }}</p>
                  <p class="text-xs opacity-60">{{ conversation.time }}</p>
                </div>
                <div v-if="conversation.unread > 0" class="bg-emerald-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {{ conversation.unread }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Message Detail -->
      <div class="lg:col-span-2">
        <div v-if="selectedConversation" class="card">
          <!-- Header -->
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
                <User class="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-slate-900">{{ selectedConversation.contact }}</h3>
                <p class="text-sm text-slate-500">{{ selectedConversation.phone }}</p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button class="text-slate-500 hover:text-slate-900"><Phone class="w-5 h-5" /></button>
              <button class="text-slate-500 hover:text-slate-900"><MoreVertical class="w-5 h-5" /></button>
              <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <select
                  class="input-field w-full sm:w-48"
                  :value="selectedTemplateId"
                  @change="emit('update:selectedTemplateId', ($event.target as HTMLSelectElement).value || null)"
                >
                  <option :value="null">Seleziona template</option>
                  <option v-for="t in templates" :key="t.id" :value="String(t.id)">{{ t.name }} ({{ t.language }})</option>
                </select>
                <button class="btn-secondary w-full sm:w-auto" @click="emit('sendSelectedTemplate')">Invia Template</button>
              </div>
            </div>
          </div>

          <!-- Message Bubbles -->
          <div ref="msgContainer" class="mt-2 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 h-64 overflow-y-auto">
            <div class="space-y-4">
              <div v-if="selectedConversation.messages.length === 0" class="text-center text-slate-500 text-sm py-10">
                Nessun messaggio. Inizia la conversazione!
              </div>
              <div
                v-for="message in selectedConversation.messages"
                :key="message.id"
                class="flex"
                :class="message.direction === 'outgoing' ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm"
                  :class="message.direction === 'outgoing' ? 'wa-bubble-out' : 'wa-bubble-in'"
                >
                  <p class="text-sm">{{ message.content }}</p>
                  <p class="text-xs mt-1 opacity-75">{{ message.time }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Message Input -->
          <div class="border-t border-slate-200 pt-4">
            <div class="flex items-center space-x-3">
              <button class="text-slate-500 hover:text-slate-900"><Paperclip class="w-5 h-5" /></button>
              <input
                type="text"
                placeholder="Scrivi un messaggio..."
                class="flex-1 input-field"
                :value="newMessage"
                @input="emit('update:newMessage', ($event.target as HTMLInputElement).value)"
                @keyup.enter="emit('sendMessage')"
              />
              <button @click="emit('sendMessage')" class="btn-primary wa-btn-primary">
                <Send class="w-4 h-4" />
              </button>
            </div>
            <div class="mt-3 text-xs" :class="sendStatusType === 'success' ? 'text-green-600' : sendStatusType === 'error' ? 'text-red-600' : 'text-gray-500'">
              {{ sendStatus }}
            </div>
          </div>
        </div>

        <div v-else class="card h-96 flex items-center justify-center">
          <div class="text-center">
            <MessageCircle class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500">Seleziona una conversazione per iniziare</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { User, MessageCircle, Phone, MoreVertical, Paperclip, Send } from 'lucide-vue-next'
import type { WhatsAppConversation, WhatsAppTemplate } from '@/types'

const props = defineProps<{
  conversations: WhatsAppConversation[]
  selectedConversation: WhatsAppConversation | null
  newMessage: string
  sendStatus: string
  sendStatusType: string
  templates: WhatsAppTemplate[]
  selectedTemplateId: string | null
}>()

const msgContainer = ref<HTMLElement | null>(null)

const scrollToBottom = () => nextTick(() => {
  if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight
})

watch(() => props.selectedConversation?.messages?.length, scrollToBottom)
watch(() => props.selectedConversation?.id, scrollToBottom)

const emit = defineEmits<{
  'selectConversation': [conv: any]
  'update:newMessage': [value: string]
  'update:selectedTemplateId': [value: string | null]
  'sendMessage': []
  'sendSelectedTemplate': []
}>()
</script>

<style scoped>
.wa-btn-primary {
  @apply bg-emerald-600 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/20;
}
.wa-bubble-out {
  @apply bg-emerald-600 text-white border border-emerald-600;
}
.wa-bubble-in {
  @apply bg-white/80 text-slate-900 border border-slate-200/70;
}
</style>
