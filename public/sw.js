/**
 * PillarPro Production-Grade Service Worker
 * Designed for Next.js App Router on Vercel.
 *
 * Security Principles:
 * 1. Zero caching of Supabase API endpoints, auth tokens, or private business payloads.
 * 2. Network-first for document navigations to avoid trapping users on stale Vercel deployments.
 * 3. Graceful offline fallback (/offline) for construction site disconnections.
 * 4. Stale-while-revalidate for hashed static assets (/_next/static/).
 */

const CACHE_NAME = 'pillarpro-v2'

// Core static assets required for standalone app shell & offline page
const PRECACHE_ASSETS = [
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable.png',
  '/apple-touch-icon.png',
  '/icon.svg',
]

// Install Event: Pre-cache static shell & offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(PRECACHE_ASSETS)

        // `/offline` is a Next.js page. Cache its generated JS/CSS as well so
        // the read-only local snapshot viewer can hydrate without a network.
        const offlinePage = await fetch('/offline', { cache: 'reload' })
        const html = await offlinePage.clone().text()
        const assets = [...html.matchAll(/(?:src|href)="([^"?]+(?:\?[^\"]*)?)"/g)]
          .map((match) => match[1])
          .filter((asset) => asset.startsWith('/_next/'))

        await Promise.all(assets.map((asset) => cache.add(asset).catch(() => undefined)))
      })
      .then(() => self.skipWaiting())
  )
})

// Activate Event: Clear obsolete caches from prior versions
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

// Message Event: Enable immediate activation upon client update notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Fetch Event: Selective routing with strict security guards
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 1. Only intercept GET requests; mutations (POST/PUT/DELETE) bypass service worker
  if (request.method !== 'GET') {
    return
  }

  // 2. CRITICAL SECURITY GUARD:
  // Never intercept or cache Supabase requests, auth endpoints, or internal /api/ routes
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/')
  ) {
    return
  }

  // 3. Navigation Requests (HTML pages: /dashboard, /projects, etc.)
  // Strategy: Network-First to guarantee latest Vercel deployment & fresh session status
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // If offline and request fails, serve the cached offline fallback screen
          return caches.match('/offline').then((response) => {
            return (
              response ||
              new Response(
                '<h1>Offline</h1><p>Please reconnect to the internet to access PillarPro.</p>',
                { headers: { 'Content-Type': 'text/html' } }
              )
            )
          })
        })
    )
    return
  }

  // 4. Next.js Immutable Static Chunks (/_next/static/*)
  // Strategy: Stale-While-Revalidate (Content hashed by Next.js, safe to cache)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
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
      })
    )
    return
  }

  // 5. App Icons & Public Pre-cached Assets
  if (
    PRECACHE_ASSETS.some((asset) => url.pathname === asset) ||
    url.pathname.startsWith('/icons/')
  ) {
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

  // Default: Pass through to network
})
