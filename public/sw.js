// Service Worker for PWA
// Handles: push notifications, asset caching, offline fallback

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `ddash-static-${CACHE_VERSION}`
const PAGES_CACHE = `ddash-pages-${CACHE_VERSION}`
const ALL_CACHES = [STATIC_CACHE, PAGES_CACHE]

const PRECACHE_URLS = ['/offline', '/icons/icon-192.png', '/icons/icon-512.png', '/favicon.ico']

// ── Install: precache offline fallback + key assets ──
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)))
  self.skipWaiting()
})

// ── Activate: clean old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('ddash-') && !ALL_CACHES.includes(name))
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => clients.claim()),
  )
})

// ── Message: skip waiting from client ──
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ── Fetch: strategy-based routing ──
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests
  if (url.origin !== self.location.origin) return
  if (request.method !== 'GET') return

  // Never cache API, admin, or Next.js data routes
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return
  if (url.pathname.startsWith('/_next/data/')) return

  // Cache-first: immutable static assets (hash-named by Next.js)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Cache-first: JS/CSS files
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Network-first: HTML navigation with offline fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }
})

// ── Caching strategies ──

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(PAGES_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached

    const offlinePage = await caches.match('/offline')
    return offlinePage || new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

// ── Push Notifications ──

self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      url: data.url || '/',
    },
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(data.title || 'DDNet Bingo', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      return clients.openWindow(url)
    }),
  )
})
