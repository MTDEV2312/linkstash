// Service Worker para LinkStash
const CACHE_VERSION = 'linkstash-v2'
const CACHE_NAME = `${CACHE_VERSION}-static`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`

const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
const log = (...args) => {
  if (isDev) console.log(...args);
};
const logError = (...args) => {
  if (isDev) console.error(...args);
};

// Archivos a cachear en la instalación
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        logError('[ServiceWorker] Error al precachear:', err)
      })
    })
  )
  self.skipWaiting()
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  return self.clients.claim()
})

// Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Ignorar peticiones que no sean HTTP/HTTPS
  if (!url.protocol.startsWith('http')) {
    return
  }
  
  // NO interceptar peticiones cross-origin (APIs externas, scripts CDN como Cloudflare, backend, Supabase)
  if (url.origin !== self.location.origin) {
    return
  }
  
  // Para navegación en SPA: buscar index.html si falla la red
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithIndex(request))
    return
  }

  if (request.method === 'GET') {
    // Para archivos estáticos: Cache First
    if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot)$/)) {
      event.respondWith(cacheFirst(request))
    } else {
      event.respondWith(networkFirst(request))
    }
  }
})

// Estrategia Cache First
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  
  if (cached) {
    return cached
  }
  
  try {
    const response = await fetch(request)
    if (response.status === 200) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    return cached || Response.error()
  }
}

// Estrategia Network First para recursos generales
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  
  try {
    const response = await fetch(request)
    if (response.status === 200) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }
    return Response.error()
  }
}

// Network First con fallback a index.html para SPA routing
async function networkFirstWithIndex(request) {
  try {
    const response = await fetch(request)
    if (response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cache = await caches.open(RUNTIME_CACHE)
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }
    
    // Fallback a /index.html para que el router de React maneje la ruta
    const staticCache = await caches.open(CACHE_NAME)
    const indexCached = await staticCache.match('/index.html')
    if (indexCached) {
      return indexCached
    }
    
    return Response.error()
  }
}

// Escuchar mensajes desde la aplicación
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        )
      })
    )
  }
})
