<template>
  <div class="fixed top-4 right-4 z-50 space-y-2">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="[
        'flex items-center p-4 rounded-lg shadow-lg min-w-[300px] max-w-[400px] transition-all duration-300',
        {
          'bg-green-50 border border-green-200': toast.type === 'success',
          'bg-red-50 border border-red-200': toast.type === 'error',
          'bg-blue-50 border border-blue-200': toast.type === 'info',
          'bg-yellow-50 border border-yellow-200': toast.type === 'warning'
        }
      ]"
    >
      <div class="flex-shrink-0">
        <CheckCircle 
          v-if="toast.type === 'success'" 
          class="h-5 w-5 text-green-600" 
        />
        <XCircle 
          v-else-if="toast.type === 'error'" 
          class="h-5 w-5 text-red-600" 
        />
        <Info 
          v-else-if="toast.type === 'info'" 
          class="h-5 w-5 text-blue-600" 
        />
        <AlertTriangle 
          v-else-if="toast.type === 'warning'" 
          class="h-5 w-5 text-yellow-600" 
        />
      </div>
      <div class="ml-3 flex-1">
        <p 
          :class="[
            'text-sm font-medium',
            {
              'text-green-800': toast.type === 'success',
              'text-red-800': toast.type === 'error',
              'text-blue-800': toast.type === 'info',
              'text-yellow-800': toast.type === 'warning'
            }
          ]"
        >
          {{ toast.message }}
        </p>
      </div>
      <div class="ml-4 flex-shrink-0">
        <button
          @click="removeToast(toast.id)"
          class="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition ease-in-out duration-150"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toasts, removeToast } = useToast()
</script>