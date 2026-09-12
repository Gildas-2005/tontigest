/* TontiGest — Service Worker (PWA)
   Stratégie : réseau d'abord pour la navigation, cache de secours offline,
   cache-first pour les assets statiques. */
const CACHE = 'tontigest-v2'
const SHELL = ['/', '/index.html', '/logo.jpeg', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return

  // API et pages dynamiques : réseau d'abord (jamais mis en cache)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
    return
  }

  // Navigation : réseau d'abord, shell en secours
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')))
    return
  }

  // Assets : cache d'abord, sinon réseau puis mise en cache
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const copy = r.clone()
      caches.open(CACHE).then(c => c.put(e.request, copy))
      return r
    }))
  )
})
