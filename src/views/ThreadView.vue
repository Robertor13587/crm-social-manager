<template>
  <div class="h-[calc(100vh-7rem)]">
    <Thread :conversation_id="conversation_id" :platform="platform" :contact_id="contact_id" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Thread from '@/components/thread/Thread.vue'

const route = useRoute()
const platform = computed(() => String(route.query.platform || ''))
const contact_id = computed(() => String(route.query.contact_id || ''))
const conversation_id = computed(() => String(route.query.conversation_id || ''))
</script>

<style scoped>
</style>
