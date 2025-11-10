// Utilidades para extraer mensajes de error del servidor
export function extractServerMessage(error) {
  if (!error) return 'Error inesperado'

  // Axios error with response
  const resp = error.response || error

  // Common formats:
  // { data: { message: '...' } }
  // { data: { errors: [...] } }
  // { message: '...' }

  const data = resp.data
  if (data) {
    if (typeof data.message === 'string' && data.message.trim()) return data.message
    if (Array.isArray(data.errors) && data.errors.length) {
      // errors could be array of strings or objects
      const first = data.errors[0]
      if (typeof first === 'string') return first
      if (first && typeof first.msg === 'string') return first.msg
      if (first && typeof first.message === 'string') return first.message
    }
    // Some APIs return { error: '...' }
    if (typeof data.error === 'string') return data.error
  }

  if (typeof resp.message === 'string' && resp.message.trim()) return resp.message

  // Fallback
  return 'Error inesperado del servidor'
}

export default extractServerMessage

// Decide if the error should trigger a toast (server/internal errors)
export function shouldToastError(error) {
  const status = error?.response?.status
  // If no response (network error), toast it
  if (!status) return true
  // Only toast server errors (5xx). For client errors (4xx) prefer inline messages.
  return status >= 500
}

