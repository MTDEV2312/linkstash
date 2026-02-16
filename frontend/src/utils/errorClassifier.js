/**
 * Tipos de errores en LinkStash
 */
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',           // Sin conexión, timeout
  UNAUTHORIZED: 'UNAUTHORIZED', // 401 - Sesión expirada
  FORBIDDEN: 'FORBIDDEN',       // 403 - Sin permisos
  NOT_FOUND: 'NOT_FOUND',       // 404 - Recurso no existe
  VALIDATION: 'VALIDATION',     // 422 - Datos inválidos
  CONFLICT: 'CONFLICT',         // 409 - Duplicado/conflicto
  SERVER: 'SERVER',             // 500+ - Error servidor
  ABORT: 'ABORT',               // AbortError - Cancelado por usuario
  UNKNOWN: 'UNKNOWN'            // Otro error
}

/**
 * Clasificar error y retornar información normalizada
 */
export const classifyError = (error) => {
  // AbortError
  if (error?.name === 'AbortError') {
    return {
      type: ERROR_TYPES.ABORT,
      message: 'Solicitud cancelada',
      statusCode: null,
      details: null
    }
  }

  // NetworkError / No response
  if (!error?.response) {
    // Timeout or network error
    if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network')) {
      return {
        type: ERROR_TYPES.NETWORK,
        message: 'Error de conexión. Verifica tu internet',
        statusCode: null,
        details: error?.message
      }
    }
    
    // Generic network error
    return {
      type: ERROR_TYPES.NETWORK,
      message: 'Error de conexión',
      statusCode: null,
      details: error?.message
    }
  }

  // HTTP errors
  const status = error.response.status
  const data = error.response.data

  switch (status) {
    case 400:
      return {
        type: ERROR_TYPES.VALIDATION,
        message: data?.message || 'Datos inválidos',
        statusCode: 400,
        details: data?.errors || data?.message
      }

    case 401:
      return {
        type: ERROR_TYPES.UNAUTHORIZED,
        message: 'Sesión expirada. Por favor inicia sesión de nuevo',
        statusCode: 401,
        details: null
      }

    case 403:
      return {
        type: ERROR_TYPES.FORBIDDEN,
        message: 'No tienes permiso para acceder a esto',
        statusCode: 403,
        details: null
      }

    case 404:
      return {
        type: ERROR_TYPES.NOT_FOUND,
        message: data?.message || 'Recurso no encontrado',
        statusCode: 404,
        details: null
      }

    case 409:
      return {
        type: ERROR_TYPES.CONFLICT,
        message: data?.message || 'Este recurso ya existe',
        statusCode: 409,
        details: data?.message
      }

    case 422:
      return {
        type: ERROR_TYPES.VALIDATION,
        message: data?.message || 'Los datos enviados no son válidos',
        statusCode: 422,
        details: data?.errors || data?.message // Array de errores de validación
      }

    case 500:
    case 501:
    case 502:
    case 503:
      return {
        type: ERROR_TYPES.SERVER,
        message: 'Error del servidor. Por favor intenta más tarde',
        statusCode: status,
        details: data?.message
      }

    default:
      if (status >= 500) {
        return {
          type: ERROR_TYPES.SERVER,
          message: 'Error del servidor',
          statusCode: status,
          details: data?.message
        }
      }

      return {
        type: ERROR_TYPES.UNKNOWN,
        message: data?.message || 'Error desconocido',
        statusCode: status,
        details: data?.message
      }
  }
}

/**
 * Determinar si debe mostrarse un toast
 * Algunos errores se manejan internamente sin notificación
 */
export const shouldShowErrorToast = (errorType) => {
  // No mostrar toast para errores cancelados
  if (errorType === ERROR_TYPES.ABORT) return false
  // Mostrar toast para todos los otros
  return true
}

/**
 * Determinar si el error requiere reautenticación
 */
export const shouldReauthenticate = (errorType) => {
  return errorType === ERROR_TYPES.UNAUTHORIZED
}

/**
 * Extraer mensajes de validación desde errores 422
 */
export const getValidationErrors = (errorDetails) => {
  if (!errorDetails) return {}

  // Si es un array, convertir a object con campo como clave
  if (Array.isArray(errorDetails)) {
    return errorDetails.reduce((acc, err) => {
      if (err.field) {
        acc[err.field] = err.message
      }
      return acc
    }, {})
  }

  // Si ya es object, retornar tal cual
  if (typeof errorDetails === 'object') {
    return errorDetails
  }

  return {}
}

/**
 * Crear error normalizado para mostrar en UI
 */
export const createErrorResponse = (error) => {
  const classified = classifyError(error)
  return {
    ...classified,
    shouldShowToast: shouldShowErrorToast(classified.type),
    shouldReauthenticate: shouldReauthenticate(classified.type),
    validationErrors: 
      classified.type === ERROR_TYPES.VALIDATION
        ? getValidationErrors(classified.details)
        : {}
  }
}
