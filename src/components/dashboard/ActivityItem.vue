<template>
  <div class="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
    <div class="flex-shrink-0">
      <div 
        class="w-10 h-10 rounded-full flex items-center justify-center"
        :class="activityTypeClass"
      >
        <component 
          :is="iconComponent" 
          class="w-5 h-5 text-white"
        />
      </div>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium text-gray-900">
          {{ activity.contact }}
        </p>
        <p class="text-xs text-gray-500">
          {{ activity.time }}
        </p>
      </div>
      <div class="mt-1 flex items-center space-x-2">
        <span 
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
          :class="platformClass"
        >
          {{ activity.platform === 'whatsapp' ? 'WhatsApp' : 'Instagram' }}
        </span>
        <p class="text-sm text-gray-600 truncate">
          {{ activity.message }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MessageSquare, FileText, Zap } from 'lucide-vue-next'

interface Props {
  activity: {
    id: number
    type: string
    platform: string
    contact: string
    message: string
    time: string
  }
}

const props = defineProps<Props>()

const iconMap = {
  message: MessageSquare,
  template: FileText,
  automation: Zap
}

const iconComponent = computed(() => {
  return iconMap[props.activity.type as keyof typeof iconMap] || MessageSquare
})

const activityTypeClass = computed(() => {
  const typeMap = {
    message: 'bg-blue-500',
    template: 'bg-green-500',
    automation: 'bg-purple-500'
  }
  return typeMap[props.activity.type as keyof typeof typeMap] || 'bg-gray-500'
})

const platformClass = computed(() => {
  const platformMap = {
    whatsapp: 'bg-green-100 text-green-800',
    instagram: 'bg-pink-100 text-pink-800'
  }
  return platformMap[props.activity.platform as keyof typeof platformMap] || 'bg-gray-100 text-gray-800'
})
</script>
