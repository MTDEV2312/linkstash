import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerServiceWorker } from './utils/serviceWorker'
import { initSentry } from './utils/sentry'

// Inicializar Sentry antes de renderizar
initSentry()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Feedback de conexión
function showConnectionBanner(isOnline) {
  let banner = document.getElementById('connection-banner')
  if (!banner) {
    banner = document.createElement('div')
    banner.id = 'connection-banner'
    banner.style.position = 'fixed'
    banner.style.bottom = '16px'
    banner.style.right = '16px'
    banner.style.zIndex = '9999'
    banner.style.padding = '8px 12px'
    banner.style.borderRadius = '6px'
    banner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
    document.body.appendChild(banner)
  }
  if (isOnline) {
    banner.textContent = 'Conexión restaurada'
    banner.style.background = '#dcfce7'
    banner.style.color = '#166534'
    setTimeout(() => banner.remove(), 2000)
  } else {
    banner.textContent = 'Sin conexión. Algunas funciones no estarán disponibles.'
    banner.style.background = '#fee2e2'
    banner.style.color = '#991b1b'
  }
}
window.addEventListener('online', () => showConnectionBanner(true))
window.addEventListener('offline', () => showConnectionBanner(false))

// Registrar Service Worker en producción
if (import.meta.env.PROD) {
  registerServiceWorker()
    .then(registration => {
      if (registration) {
        console.log('✅ Service Worker activo')
      }
    })
    .catch(error => {
      console.error('❌ Error al registrar Service Worker:', error)
    })
}
