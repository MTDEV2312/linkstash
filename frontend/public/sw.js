// Service Worker para LinkStash
// Versión del cache - incrementar cuando se actualice el contenido
const CACHE_VERSION = 'linkstash-v1'
const CACHE_NAME = `${CACHE_VERSION}-static`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`

// Solo mostrar logs en entorno de desarrollo (localhost o 127.0.0.1)
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
  '/manifest.json',
  '/offline.html', // Página offline de respaldo
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  log('[ServiceWorker] Instalando...')
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      log('[ServiceWorker] Precacheando archivos estáticos')
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        logError('[ServiceWorker] Error al precachear:', err)
      })
    })
  )
  
  // Forzar la activación inmediata
  self.skipWaiting()
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  log('[ServiceWorker] Activando...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Eliminar caches antiguos
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            log('[ServiceWorker] Eliminando cache antiguo:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  
  // Tomar control de todas las páginas inmediatamente
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
  
  // NO interceptar peticiones cross-origin (al backend, APIs externas, etc)
  // Solo cachear recursos del mismo origen
  if (url.origin !== self.location.origin) {
    return // Dejar que el navegador maneje peticiones cross-origin normalmente
  }
  
  // Estrategia de caché según el tipo de petición
  if (request.method === 'GET') {
    // Para archivos estáticos: Cache First
    if (
      url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot)$/)
    ) {
      event.respondWith(cacheFirst(request))
    }
    // Para peticiones a la API: Network First
    else if (url.pathname.startsWith('/api/')) {
      event.respondWith(networkFirst(request))
    }
    // Para navegación: Network First con fallback offline
    else if (request.mode === 'navigate') {
      event.respondWith(networkFirstWithOffline(request))
    }
    // Por defecto: Network First
    else {
      event.respondWith(networkFirst(request))
    }
  }
})

// Estrategia Cache First: Primero busca en cache, si no hay, va a red
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  
  if (cached) {
    return cached
  }
  
  try {
    const response = await fetch(request)
    
    // Solo cachear respuestas exitosas
    if (response.status === 200) {
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    logError('[ServiceWorker] Error en cacheFirst:', error)
    throw error
  }
}

// Estrategia Network First: Primero intenta red, si falla usa cache
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  
  try {
    const response = await fetch(request)
    
    // Cachear respuestas exitosas
    if (response.status === 200) {
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    log('[ServiceWorker] Network failed, usando cache:', request.url)
    const cached = await cache.match(request)
    
    if (cached) {
      return cached
    }
    
    throw error
  }
}

// Network First con página offline de respaldo
async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request)
    
    // Cachear páginas de navegación exitosas
    if (response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    log('[ServiceWorker] Network failed, buscando en cache')
    
    // Intentar encontrar en cache
    const cache = await caches.open(RUNTIME_CACHE)
    const cached = await cache.match(request)
    
    if (cached) {
      return cached
    }
    
    // Si no hay nada en cache, mostrar página offline
    const offlineCache = await caches.open(CACHE_NAME)
    const offline = await offlineCache.match('/offline.html')
    
    if (offline) {
      return offline
    }
    
    // Fallback final: respuesta HTML básica
    return new Response(
      '<html><body><h1>Sin conexión</h1><p>Por favor, verifica tu conexión a internet.</p></body></html>',
      {
        headers: { 'Content-Type': 'text/html' }
      }
    )
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
