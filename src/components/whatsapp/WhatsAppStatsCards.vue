<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
    <div class="card">
      <div class="flex items-center">
        <div class="p-2 bg-emerald-100 rounded-2xl">
          <MessageCircle class="h-6 w-6 text-emerald-700" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-semibold text-slate-600">Messaggi totali</p>
          <p class="text-2xl font-semibold tracking-tight text-slate-900">{{ totalMessages }}</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center">
        <div class="p-2 bg-blue-100 rounded-2xl">
          <Users class="h-6 w-6 text-blue-700" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-semibold text-slate-600">Rubrica contatti</p>
          <p class="text-2xl font-semibold tracking-tight text-slate-900">{{ contactsTotal }}</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center">
        <div class="p-2 bg-amber-100 rounded-2xl">
          <MessageCircle class="h-6 w-6 text-amber-700" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-semibold text-slate-600">Conversazioni attive</p>
          <p class="text-2xl font-semibold tracking-tight text-slate-900">{{ conversationsCount }}</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center">
        <div class="p-2 bg-violet-100 rounded-2xl">
          <Calendar class="h-6 w-6 text-violet-700" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-semibold text-slate-600">Messaggi oggi</p>
          <p class="text-2xl font-semibold tracking-tight text-slate-900">{{ messagesToday }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MessageCircle, Users, Calendar } from 'lucide-vue-next'

defineProps<{
  totalMessages: number
  contactsTotal: number
  conversationsCount: number
  messagesToday: number
}>()
</script>
