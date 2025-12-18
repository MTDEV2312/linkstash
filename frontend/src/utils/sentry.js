import * as Sentry from '@sentry/react'

/**
 * Inicializa Sentry para error tracking
 * Solo se activa en producción
 */
export function initSentry() {
  // Solo inicializar en producción
  if (import.meta.env.PROD) {
    Sentry.init({
      // DSN de tu proyecto Sentry
      // IMPORTANTE: Reemplazar con tu DSN real
      // dsn: 'https://your-dsn@sentry.io/your-project-id',
      dsn: import.meta.env.VITE_SENTRY_DSN || '',
      
      // Nombre del entorno
      environment: import.meta.env.MODE || 'production',
      
      // Versión de la aplicación (importante para releases)
      release: `linkstash@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
      
      // Porcentaje de traces a enviar (performance monitoring)
      tracesSampleRate: 0.2, // 20% de las transacciones
      
      // Captura replays de sesiones con errores
      replaysSessionSampleRate: 0.1, // 10% de sesiones normales
      replaysOnErrorSampleRate: 1.0, // 100% cuando hay error
      
      // Integración básica (sin router instrumentation que requiere imports adicionales)
      integrations: [
        // Browser tracing básico
        Sentry.browserTracingIntegration(),
        
        // Replay integration si está disponible
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Filtrar errores que no son importantes
      beforeSend(event, hint) {
        const error = hint.originalException
        
        // Ignorar errores de red comunes
        if (error && error.message) {
          if (
            error.message.includes('Network Error') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('Load failed')
          ) {
            return null // No enviar a Sentry
          }
        }
        
        // Ignorar errores de extensiones del navegador
        if (event.exception) {
          const frames = event.exception.values[0]?.stacktrace?.frames
          if (frames && frames.some(frame => 
            frame.filename?.includes('extension://') ||
            frame.filename?.includes('chrome-extension://')
          )) {
            return null
          }
        }
        
        return event
      },
      
      // Agregar contexto adicional
      beforeBreadcrumb(breadcrumb) {
        // Filtrar breadcrumbs sensibles (contraseñas, tokens, etc.)
        if (breadcrumb.category === 'console' && breadcrumb.message) {
          // No registrar logs que contengan información sensible
          if (
            breadcrumb.message.includes('token') ||
            breadcrumb.message.includes('password') ||
            breadcrumb.message.includes('apiKey')
          ) {
            return null
          }
        }
        return breadcrumb
      },
    })
    
    console.log('✅ Sentry inicializado')
  } else {
    console.log('ℹ️ Sentry deshabilitado en desarrollo')
  }
}

/**
 * Captura un error manualmente en Sentry
 * @param {Error} error - El error a capturar
 * @param {Object} context - Contexto adicional
 */
export function captureError(error, context = {}) {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      extra: context,
    })
  } else {
    console.error('Error capturado:', error, context)
  }
}

/**
 * Captura un mensaje en Sentry
 * @param {string} message - Mensaje a capturar
 * @param {string} level - Nivel de severidad (info, warning, error)
 */
export function captureMessage(message, level = 'info') {
  if (import.meta.env.PROD) {
    Sentry.captureMessage(message, level)
  } else {
    console.log(`[${level}] ${message}`)
  }
}

/**
 * Establece el usuario actual para Sentry
 * @param {Object} user - Datos del usuario
 */
export function setUser(user) {
  if (import.meta.env.PROD) {
    Sentry.setUser(user ? {
      id: user._id,
      username: user.username,
      email: user.email,
    } : null)
  }
}

/**
 * Agrega contexto adicional a los eventos
 * @param {string} key - Clave del contexto
 * @param {Object} data - Datos del contexto
 */
export function setContext(key, data) {
  if (import.meta.env.PROD) {
    Sentry.setContext(key, data)
  }
}

/**
 * Agrega tags personalizados
 * @param {Object} tags - Tags a agregar
 */
export function setTags(tags) {
  if (import.meta.env.PROD) {
    Sentry.setTags(tags)
  }
}

/**
 * Wrapper para componentes React con profiling de Sentry
 * @param {React.Component} Component - Componente a envolver
 * @param {Object} options - Opciones de profiling
 * @returns {React.Component}
 */
export function withSentryProfiling(Component, options = {}) {
  if (import.meta.env.PROD && Sentry.withProfiler) {
    return Sentry.withProfiler(Component, options)
  }
  return Component
}

// Re-exportar ErrorBoundary de Sentry
export const SentryErrorBoundary = import.meta.env.PROD 
  ? Sentry.ErrorBoundary 
  : ({ children }) => children
