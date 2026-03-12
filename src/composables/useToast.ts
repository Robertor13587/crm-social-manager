import { ref } from 'vue'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  // Structured fields for message notifications
  platform?: 'whatsapp' | 'instagram' | 'facebook'
  contactName?: string
  preview?: string
}

const toasts = ref<Toast[]>([])

export const useToast = () => {
  const showToast = (message: string, type: Toast['type'] = 'info', duration: number = 3000) => {
    const id = Date.now().toString()
    const toast: Toast = { id, message, type, duration }
    toasts.value.push(toast)
    setTimeout(() => removeToast(id), duration)
  }

  const showMessageToast = (
    platform: 'whatsapp' | 'instagram' | 'facebook',
    contactName: string,
    preview?: string,
    duration = 6000,
  ) => {
    const id = Date.now().toString()
    const toast: Toast = { id, message: '', type: 'info', duration, platform, contactName, preview }
    toasts.value.push(toast)
    setTimeout(() => removeToast(id), duration)
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) toasts.value.splice(index, 1)
  }

  return { toasts, showToast, showMessageToast, removeToast }
}
