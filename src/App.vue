<template>
  <div id="app" class="min-h-screen bg-slate-50 bg-[radial-gradient(900px_600px_at_10%_0%,rgba(37,99,235,0.12),transparent_60%),radial-gradient(900px_600px_at_90%_10%,rgba(99,102,241,0.10),transparent_55%)]">
    <template v-if="!isPublicRoute">
      <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
      <div class="lg:ml-64">
        <AppHeader @toggleSidebar="sidebarOpen = true" />
        <main class="p-4 sm:p-6">
          <ErrorBoundary>
            <RouterView />
          </ErrorBoundary>
        </main>
      </div>
    </template>
    <template v-else>
      <ErrorBoundary>
        <RouterView />
      </ErrorBoundary>
    </template>
    <Toast />
    <div v-if="isLoading" class="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
      <div class="card px-6 py-4 flex items-center space-x-3">
        <span class="w-3 h-3 rounded-full bg-primary-600 animate-ping"></span>
        <span class="text-slate-700">Caricamento…</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import Toast from '@/components/ui/Toast.vue'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import { isLoading } from '@/composables/useLoader'

const route = useRoute()
const isPublicRoute = computed(() => Boolean((route.meta as any)?.public))
const sidebarOpen = ref(false)

watch(() => route.fullPath, () => { sidebarOpen.value = false })
</script>
