import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function addToast(toast: Omit<Toast, 'id'>) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    const newToast: Toast = { ...toast, id }
    toasts.value.push(newToast)

    const duration = toast.duration ?? 4000
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  function removeToast(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function success(message: string) {
    addToast({ type: 'success', message })
  }

  function error(message: string) {
    addToast({ type: 'error', message, duration: 6000 })
  }

  function info(message: string) {
    addToast({ type: 'info', message })
  }

  function warning(message: string) {
    addToast({ type: 'warning', message, duration: 5000 })
  }

  return { toasts, addToast, removeToast, success, error, info, warning }
})
