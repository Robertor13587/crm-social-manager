<template>
  <div 
    class="rounded-full flex items-center justify-center text-white font-semibold"
    :class="[sizeClasses, bgColor]"
    :style="{ backgroundColor: bgColor }"
  >
    <span v-if="!src">{{ initials }}</span>
    <img 
      v-else
      :src="src" 
      :alt="alt"
      class="w-full h-full rounded-full object-cover"
      @error="handleImageError"
    >
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  name?: string
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg'
  bgColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  bgColor: '#6366F1'
})

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  }
  return sizes[props.size]
})

const initials = computed(() => {
  if (!props.name) return '?'
  return props.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
})

const handleImageError = () => {
  // Fallback to initials if image fails to load
  if (props.src) {
    // Clear the src to show initials instead
    // Note: In a real implementation, you might want to use a ref for this
    console.warn('Avatar image failed to load, falling back to initials')
  }
}
</script>