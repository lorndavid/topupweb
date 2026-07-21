/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />

import { precacheAndRoute } from 'workbox-precaching'

// Precache all assets injected by vite-plugin-pwa
declare const self: ServiceWorkerGlobalScope & typeof globalThis
precacheAndRoute(self.__WB_MANIFEST)

// ─── Push Notification Event ─────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json()
  if (!data) return

  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-icon-192x192.png',
    badge: data.badge || '/pwa-icon-192x192.png',
    tag: data.tag || 'default',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      reference: data.reference || '',
    },
  } as NotificationOptions & { renotify?: boolean }

  event.waitUntil(
    self.registration.showNotification(data.title || 'VidTopUp', options)
  )
})

// ─── Notification Click Event ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  // Focus or open the relevant page
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList: readonly WindowClient[]) => {
        // Try to focus an existing window with matching URL
        for (const client of clientList) {
          if (client.url.includes(url)) {
            return client.focus()
          }
        }
        // Otherwise open a new window
        return self.clients.openWindow(url)
      })
  )
})

// ─── Install Event ───────────────────────────────────────────
self.addEventListener('install', () => {
  self.skipWaiting()
})

// ─── Activate Event ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
