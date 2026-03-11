import { ref } from 'vue'

const counter = ref(0)
export const isLoading = ref(false)

export function startLoading() {
  counter.value++
  isLoading.value = counter.value > 0
}

export function stopLoading() {
  counter.value = Math.max(0, counter.value - 1)
  isLoading.value = counter.value > 0
}
