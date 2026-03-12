<template>
  <div class="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="pointer-events-auto"
    >
      <!-- Message notification toast (structured) -->
      <div
        v-if="toast.platform"
        class="w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
      >
        <!-- Platform header bar -->
        <div
          class="flex items-center justify-between px-4 py-2.5"
          :class="platformBg(toast.platform)"
        >
          <div class="flex items-center gap-2">
            <!-- WhatsApp logo -->
            <svg v-if="toast.platform === 'whatsapp'" viewBox="0 0 24 24" class="h-4 w-4 flex-shrink-0" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <!-- Instagram logo -->
            <svg v-else-if="toast.platform === 'instagram'" viewBox="0 0 24 24" class="h-4 w-4 flex-shrink-0" fill="white">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <!-- Facebook logo -->
            <svg v-else-if="toast.platform === 'facebook'" viewBox="0 0 24 24" class="h-4 w-4 flex-shrink-0" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span class="text-xs font-semibold text-white tracking-wide uppercase">
              {{ platformLabel(toast.platform) }}
            </span>
          </div>
          <button
            @click="removeToast(toast.id)"
            class="text-white/70 hover:text-white transition-colors"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
        <!-- Body -->
        <div class="px-4 py-3">
          <div class="flex items-start gap-3">
            <MessageCircle class="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-900 truncate">{{ toast.contactName }}</p>
              <p v-if="toast.preview" class="text-xs text-slate-500 mt-0.5 line-clamp-2">{{ toast.preview }}</p>
              <p v-else class="text-xs text-slate-400 mt-0.5 italic">Nuovo messaggio</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Generic toast (existing style) -->
      <div
        v-else
        :class="[
          'flex items-center p-4 rounded-xl shadow-lg min-w-[300px] max-w-[360px] border',
          {
            'bg-green-50 border-green-200': toast.type === 'success',
            'bg-red-50 border-red-200': toast.type === 'error',
            'bg-blue-50 border-blue-200': toast.type === 'info',
            'bg-yellow-50 border-yellow-200': toast.type === 'warning',
          }
        ]"
      >
        <div class="flex-shrink-0">
          <CheckCircle v-if="toast.type === 'success'" class="h-5 w-5 text-green-600" />
          <XCircle v-else-if="toast.type === 'error'" class="h-5 w-5 text-red-600" />
          <Info v-else-if="toast.type === 'info'" class="h-5 w-5 text-blue-600" />
          <AlertTriangle v-else-if="toast.type === 'warning'" class="h-5 w-5 text-yellow-600" />
        </div>
        <div class="ml-3 flex-1">
          <p
            class="text-sm font-medium"
            :class="{
              'text-green-800': toast.type === 'success',
              'text-red-800': toast.type === 'error',
              'text-blue-800': toast.type === 'info',
              'text-yellow-800': toast.type === 'warning',
            }"
          >
            {{ toast.message }}
          </p>
        </div>
        <div class="ml-4 flex-shrink-0">
          <button
            @click="removeToast(toast.id)"
            class="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle, XCircle, Info, AlertTriangle, X, MessageCircle } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toasts, removeToast } = useToast()

const platformLabel = (p: string) => {
  if (p === 'whatsapp') return 'WhatsApp'
  if (p === 'instagram') return 'Instagram'
  if (p === 'facebook') return 'Facebook'
  return p
}

const platformBg = (p: string) => {
  if (p === 'whatsapp') return 'bg-emerald-500'
  if (p === 'instagram') return 'bg-gradient-to-r from-purple-500 to-pink-500'
  if (p === 'facebook') return 'bg-blue-600'
  return 'bg-slate-700'
}
</script>
