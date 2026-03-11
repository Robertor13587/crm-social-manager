<template>
  <div class="card card-hover">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold text-slate-600">{{ title }}</p>
        <p class="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{{ value }}</p>
      </div>
      <div class="flex items-center space-x-2">
        <component 
          :is="iconComponent" 
          class="w-8 h-8"
          :class="iconColorClass"
        />
      </div>
    </div>
    <div class="mt-4 flex items-center">
      <span 
        class="text-sm font-semibold"
        :class="changeDirection === 'up' ? 'text-green-600' : 'text-red-600'"
      >
        {{ change }}
      </span>
      <span class="ml-2 text-sm text-slate-500">rispetto a ieri</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MessageSquare, Inbox, Clock, Heart } from 'lucide-vue-next'

interface Props {
  title: string
  value: string
  change: string
  icon: string
  color: string
}

const props = defineProps<Props>()

const iconMap = {
  MessageSquare,
  Inbox,
  Clock,
  Heart
}

const iconComponent = computed(() => {
  return iconMap[props.icon as keyof typeof iconMap] || MessageSquare
})

const iconColorClass = computed(() => {
  const colorMap = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
    red: 'text-red-500'
  }
  return colorMap[props.color as keyof typeof colorMap] || 'text-blue-500'
})

const changeDirection = computed(() => {
  return props.change.startsWith('+') ? 'up' : 'down'
})
</script>
