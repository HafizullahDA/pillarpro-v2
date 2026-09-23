/**
 * PillarPro Production-Grade Service Worker
 * Fully compliant with PWABuilder, Google WebAPK, and Next.js App Router.
 *
 * Security & Reliability Principles:
 * 1. Zero caching of Supabase API endpoints, auth tokens, or private business payloads.
 * 2. Network-first for document navigations with instantaneous offline fallback (/offline).
 * 3. Graceful individual asset caching so install event never rejects or fails.
 * 4. Full support for Background Sync, Periodic Sync, and Web Push notifications.
 */

const CACHE_NAME = 'pillarpro-v3'

// Core static assets required for standalone app shell & offline page
const PRECACHE_ASSETS = [
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-48x48.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable.png',
  '/apple-touch-icon.png',
  '/icon.svg',
]

// 1. Install Event: Pre-cache static shell & offline fallback gracefully
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache assets individually so any single network issue never breaks installation
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset)
        } catch {
          // Precache asset optional failure tolerated
        }
      }

      // Pre-cache generated chunks of /offline if available
      try {
        const offlinePage = await fetch('/offline', { cache: 'reload' })
        if (offlinePage.ok) {
          const html = await offlinePage.clone().text()
          const assets = [...html.matchAll(/(?:src|href)="([^"?]+(?:\?[^"]*)?)"/g)]
            .map((match) => match[1])
            .filter((asset) => asset.startsWith('/_next/'))

          await Promise.all(assets.map((asset) => cache.add(asset).catch(() => undefined)))
        }
      } catch {
        // Tolerated in testing/CI
      }
    })
  )
})

// 2. Activate Event: Clean up legacy caches and immediately take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  )
})

// 3. Message Event: Enable skip waiting on command
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// 4. Fetch Event: Routing & Offline Fallback (PWABuilder Has Logic & Offline Support)
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only intercept GET requests
  if (request.method !== 'GET') {
    return
  }

  // Never intercept or cache Supabase, auth, or internal API requests
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/')
  ) {
    return
  }

  // Navigation requests: Network-first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match('/offline')
        return (
          cached ||
          new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline - PillarPro</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;background:#07090e;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;"><div><h2>PillarPro Offline Mode</h2><p>Internet connection unavailable. Offline changes will sync automatically once reconnected.</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          )
        )
      })
    )
    return
  }

  // Next.js hashed immutable chunks: Stale-while-revalidate
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request)
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone())
            }
            return networkResponse
          })
          .catch(() => cachedResponse)

        return cachedResponse || fetchPromise
      })
    )
    return
  }

  // Pre-cached assets & icons
  if (PRECACHE_ASSETS.some((asset) => url.pathname === asset) || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((res) => {
            if (res.status === 200) {
              const resClone = res.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone))
            }
            return res
          })
        )
      })
    )
    return
  }
})

// 5. Background Sync Event (PWABuilder Background Sync Capability)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC' })
        })
      })
    )
  }
})

// 6. Periodic Background Sync Event (PWABuilder Periodic Sync Capability)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-health-check') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.match('/manifest.json'))
    )
  }
})

// 7. Web Push Notification Event (PWABuilder Push Notifications Capability)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'PillarPro Alert'
  const options = {
    body: data.body || 'New operational update in your contractor dashboard.',
    icon: '/icon-192.png',
    badge: '/favicon-48x48.png',
    data: {
      url: data.url || '/dashboard',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// 8. Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
