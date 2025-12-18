/**
 * Registro y gestión del Service Worker
 */

// Configuración
const SW_URL = '/sw.js'
const SW_SCOPE = '/'

/**
 * Registra el Service Worker
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
  // Verificar soporte de Service Worker
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker no soportado en este navegador')
    return null
  }

  try {
    // Registrar el Service Worker
    const registration = await navigator.serviceWorker.register(SW_URL, {
      scope: SW_SCOPE
    })

    console.log('[SW] Service Worker registrado:', registration.scope)

    // Manejar actualizaciones
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Hay una nueva versión disponible
            console.log('[SW] Nueva versión disponible')
            notifyUpdate()
          }
        })
      }
    })

    // Verificar actualizaciones cada hora
    setInterval(() => {
      registration.update()
    }, 60 * 60 * 1000)

    return registration
  } catch (error) {
    console.error('[SW] Error al registrar Service Worker:', error)
    return null
  }
}

/**
 * Desregistra el Service Worker
 * @returns {Promise<boolean>}
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    
    if (registration) {
      const success = await registration.unregister()
      console.log('[SW] Service Worker desregistrado:', success)
      return success
    }
    
    return false
  } catch (error) {
    console.error('[SW] Error al desregistrar Service Worker:', error)
    return false
  }
}

/**
 * Limpia todos los caches del Service Worker
 * @returns {Promise<void>}
 */
export async function clearServiceWorkerCache() {
  if (!('serviceWorker' in navigator)) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    
    if (registration && registration.active) {
      // Enviar mensaje al SW para limpiar cache
      registration.active.postMessage({ type: 'CLEAR_CACHE' })
    }
    
    // También limpiar caches directamente
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      console.log('[SW] Caches limpiados')
    }
  } catch (error) {
    console.error('[SW] Error al limpiar caches:', error)
  }
}

/**
 * Notifica al usuario sobre una actualización disponible
 */
function notifyUpdate() {
  // Aquí puedes mostrar una notificación al usuario
  // Por ejemplo, usando react-hot-toast o un modal
  
  if (window.confirm('Hay una nueva versión disponible. ¿Desea actualizar?')) {
    window.location.reload()
  }
}

/**
 * Verifica el estado de la conexión
 * @returns {boolean}
 */
export function isOnline() {
  return navigator.onLine
}

/**
 * Agrega listeners para eventos de conexión
 * @param {Function} onOnline - Callback cuando se conecta
 * @param {Function} onOffline - Callback cuando se desconecta
 */
export function addConnectionListeners(onOnline, onOffline) {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}

/**
 * Hook React para gestionar el estado de conexión
 * Debe importarse en un componente React
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine)
  
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    return addConnectionListeners(handleOnline, handleOffline)
  }, [])
  
  return isOnline
}
