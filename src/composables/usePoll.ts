import { onMounted, onUnmounted, ref } from 'vue'

interface PollOptions {
  interval: number
  immediate?: boolean
  backoffOnError?: boolean
  maxInterval?: number
  autoStart?: boolean
}

export function usePoll(fn: () => Promise<any>, options: PollOptions) {
  const { interval: initialInterval, immediate = true, backoffOnError = false, maxInterval = 60000, autoStart = true } = options
  
  const isPolling = ref(false)
  const currentInterval = ref(initialInterval)
  let timer: number | null = null
  let errorCount = 0
  let running = false

  const run = async () => {
    if (running) return
    running = true
    try {
      await fn()
      // Reset backoff on success
      if (backoffOnError && errorCount > 0) {
        errorCount = 0
        if (currentInterval.value !== initialInterval) {
          currentInterval.value = initialInterval
          restart()
        }
      }
    } catch (err) {
      // console.error('Polling error:', err)
      if (backoffOnError) {
        errorCount++
        const nextInterval = Math.min(initialInterval * Math.pow(1.5, errorCount), maxInterval)
        if (nextInterval !== currentInterval.value) {
          currentInterval.value = nextInterval
          restart()
        }
      }
    } finally {
      running = false
    }
  }

  const start = () => {
    if (timer) return
    isPolling.value = true
    if (immediate) run()
    timer = window.setInterval(run, currentInterval.value)
  }

  const stop = () => {
    if (timer) {
      window.clearInterval(timer)
      timer = null
    }
    isPolling.value = false
  }
  
  const restart = () => {
    if (!isPolling.value) return
    if (timer) window.clearInterval(timer)
    timer = window.setInterval(run, currentInterval.value)
  }

  const boost = (tempInterval: number = 1000, duration: number = 15000) => {
    currentInterval.value = tempInterval
    restart()
    
    setTimeout(() => {
      currentInterval.value = initialInterval
      restart()
    }, duration)
  }

  onMounted(() => {
    if (autoStart) start()
  })

  onUnmounted(() => {
    stop()
  })

  return {
    start,
    stop,
    restart,
    boost,
    run,
    currentInterval
  }
}
