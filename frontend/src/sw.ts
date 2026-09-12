/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />

import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// Precache all assets injected by vite-plugin-pwa
declare const self: ServiceWorkerGlobalScope & typeof globalThis
precacheAndRoute(self.__WB_MANIFEST)

// ─── 1. Cache Game Catalog & Announcement API Responses ──────
// Uses StaleWhileRevalidate: serves from cache in 0ms, updates cache in background
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/categories') ||
    url.pathname.startsWith('/api/products/') ||
    url.pathname.startsWith('/api/cambodia-games') ||
    url.pathname.startsWith('/api/announcement'),
  new StaleWhileRevalidate({
    cacheName: 'topup-api-catalog',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
)

// ─── 2. Cache Game Media, CDN Assets & Cloudinary Images ─────
// Uses CacheFirst: lightning-fast image loading from local cache
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' &&
    (url.hostname.includes('bay2game') ||
      url.hostname.includes('postimg.cc') ||
      url.hostname.includes('cloudinary') ||
      url.pathname.includes('/images/') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.jpg')),
  new CacheFirst({
    cacheName: 'topup-game-media',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 150,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
)

// ─── Push Notification Event ─────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json()
  if (!data) return

  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
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

// ─── Update Control (SKIP_WAITING) ───────────────────────────
// Triggered when user clicks "Update Now" button in the update banner
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ─── Activate Event ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
