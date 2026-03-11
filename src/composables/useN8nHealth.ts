import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'

export function useN8nHealth() {
  const online = ref<boolean>(false)
  const checking = ref<boolean>(false)
  let timer: number | null = null

  const check = async () => {
    checking.value = true
    try {
      const { error } = await supabase
        .from('settings')
        .select('*', { count: 'exact', head: true })
      online.value = !error
    } catch {
      online.value = false
    } finally {
      checking.value = false
    }
  }

  onMounted(() => {
    void check()
    timer = window.setInterval(() => { void check() }, 30000)
  })
  onUnmounted(() => { if (timer) window.clearInterval(timer) })

  return { n8nOnline: online, n8nChecking: checking, checkN8n: check }
}
