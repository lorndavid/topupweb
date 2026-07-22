import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function add(toast: Omit<Toast, 'id'>) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
    toasts.value.push({ ...toast, id })
    const duration = toast.duration ?? 4000
    setTimeout(() => remove(id), duration)
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function success(title: string, message?: string) {
    add({ type: 'success', title, message })
  }

  function error(title: string, message?: string) {
    add({ type: 'error', title, message })
  }

  function warning(title: string, message?: string) {
    add({ type: 'warning', title, message })
  }

  function info(title: string, message?: string) {
    add({ type: 'info', title, message })
  }

  return { toasts, add, remove, success, error, warning, info }
})
