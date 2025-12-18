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
