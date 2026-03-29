// Athena Service Worker — offline shell caching for PWA installability
const CACHE_NAME = 'athena-shell-v1'

// Core shell assets to cache on install
const SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.jpg',
  '/icons/icon-512x512.jpg',
]

self.addEventListener('install', (event) => {
  console.log('[SW] Installing Athena service worker')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching shell assets')
      return cache.addAll(SHELL_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Athena service worker')
  // Remove old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key)
            return caches.delete(key)
          })
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Skip API calls and external requests — always go to network
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return

  // Shell-first strategy: serve from cache if available, fall back to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        console.log('[SW] Serving from cache:', url.pathname)
        return cached
      }
      return fetch(event.request).then((response) => {
        // Cache successful navigation responses
        if (response.ok && event.request.mode === 'navigate') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
    })
  )
})
