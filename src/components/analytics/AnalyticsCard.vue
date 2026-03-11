<template>
  <div class="card card-hover">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold text-slate-600">{{ title }}</p>
        <p class="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{{ value }}</p>
      </div>
      <div :class="['rounded-2xl p-3', colorStyles.bg]">
        <component 
          :is="iconComponent" 
          :class="['h-6 w-6', colorStyles.icon]"
        />
      </div>
    </div>
    <div class="mt-4 flex items-center">
      <span 
        :class="[
          'text-sm font-semibold',
          change.startsWith('+') ? 'text-green-600' : 'text-red-600'
        ]"
      >
        {{ change }}
      </span>
      <span class="ml-2 text-sm text-slate-500">rispetto al mese scorso</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  MessageSquare, 
  Users, 
  Clock, 
  TrendingUp 
} from 'lucide-vue-next'

interface Props {
  title: string
  value: string | number
  change: string
  icon: string
  color: string
}

const props = defineProps<Props>()

const iconComponent = computed(() => {
  const iconMap: Record<string, any> = {
    MessageSquare,
    Users,
    Clock,
    TrendingUp
  }
  return iconMap[props.icon] || MessageSquare
})

const colorStyles = computed(() => {
  const map: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-100', icon: 'text-blue-700' },
    green: { bg: 'bg-emerald-100', icon: 'text-emerald-700' },
    purple: { bg: 'bg-violet-100', icon: 'text-violet-700' },
    red: { bg: 'bg-rose-100', icon: 'text-rose-700' }
  }
  return map[props.color] || map.blue
})
</script>
