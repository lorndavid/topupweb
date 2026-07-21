import { ref } from 'vue'
import api from '@/services/api'

const permissionGranted = ref(false)
const subscribed = ref(false)
const loading = ref(false)

/**
 * Convert a base64url-encoded string to Uint8Array (required by Push API).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

/**
 * Register the service worker + subscribe to push notifications.
 * Should be called after the user has completed a payment (engagement signal).
 */
export function usePushNotifications() {
  async function requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Push notifications not supported')
      return false
    }

    if (Notification.permission === 'granted') {
      permissionGranted.value = true
      return true
    }

    if (Notification.permission === 'denied') {
      return false
    }

    const result = await Notification.requestPermission()
    permissionGranted.value = result === 'granted'
    return permissionGranted.value
  }

  async function getVapidPublicKey(): Promise<string | null> {
    try {
      const { data } = await api.get<{ success: boolean; data: { publicKey: string } }>('/push/vapid-key')
      if (data?.success && data?.data?.publicKey) {
        return data.data.publicKey
      }
    } catch {
      // silent
    }
    // Fallback: check Vite env var
    return import.meta.env.VITE_VAPID_PUBLIC_KEY || null
  }

  async function subscribe() {
    if (subscribed.value) return true
    if (loading.value) return false

    loading.value = true

    try {
      const permission = await requestPermission()
      if (!permission) {
        loading.value = false
        return false
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready

      // Get the VAPID public key
      const vapidKey = await getVapidPublicKey()
      if (!vapidKey) {
        console.warn('VAPID public key not available — push subscription skipped')
        loading.value = false
        return false
      }

      // Subscribe the SW to the push service
      const keyBuffer = urlBase64ToUint8Array(vapidKey)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBuffer as unknown as string,
      })

      // Send the real subscription to the backend
      await api.post('/push/subscribe', JSON.parse(JSON.stringify(subscription)))

      subscribed.value = true
      loading.value = false
      return true
    } catch (err) {
      console.warn('Push subscription failed:', err)
      loading.value = false
      return false
    }
  }

  async function unsubscribe() {
    if (!subscribed.value) return

    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await api.post('/push/unsubscribe', { endpoint: sub.endpoint })
      }
    } catch {
      // silent
    }

    subscribed.value = false
  }

  // Check existing subscription on init
  async function checkSubscription() {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready
        const sub = await registration.pushManager.getSubscription()
        subscribed.value = !!sub
        permissionGranted.value = Notification.permission === 'granted'
      }
    } catch {
      // silent
    }
  }

  return {
    permissionGranted,
    subscribed,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscription,
  }
}
