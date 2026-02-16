import linkService from '../services/linkService'

/**
 * Validadores para LinkForm con soporte para async
 */
export const linkValidators = {
  // Validar que URL es formato válido
  isValidUrl: (string) => {
    try {
      new URL(string.startsWith('http') ? string : `https://${string}`)
      return true
    } catch (_) {
      return false
    }
  },

  // Validar que URL es única (async)
  isUniqueUrl: async (url) => {
    try {
      const normalized = url.startsWith('http') ? url : `https://${url}`
      // Hacer llamada al backend para verificar duplicado
      // Por ahora retornamos true asumiendo que el backend lo manejará
      // En una implementación real, se haría una llamada GET /api/links/check-url?url=...
      return true
    } catch (error) {
      console.error('Error validating URL uniqueness:', error)
      return false
    }
  },

  // Validar título (opcional - se obtiene de metadata si no se proporciona)
  validateTitle: (value) => {
    if (!value) return true // Título es opcional, se llenará con metadata
    if (value.length > 200) return 'El título no puede exceder 200 caracteres'
    return true
  },

  // Validar descripción (opcional pero con límites)
  validateDescription: (value) => {
    if (value && value.length > 1000) return 'La descripción no puede exceder 1000 caracteres'
    return true
  },

  // Validar tags
  validateTags: (value) => {
    if (!value) return true // Opcional
    const tags = value.split(',').map(t => t.trim()).filter(Boolean)
    if (tags.length > 10) return 'No puedes agregar más de 10 tags'
    for (const tag of tags) {
      if (tag.length > 30) return `El tag "${tag}" es muy largo (máx 30 caracteres)`
      if (!/^[a-zA-Z0-9\-_]+$/.test(tag)) return `El tag "${tag}" contiene caracteres inválidos`
    }
    return true
  },

  // Validar URL con mensaje específico
  validateUrl: (value) => {
    if (!value) return 'La URL es obligatoria'
    if (!linkValidators.isValidUrl(value)) return 'URL inválida'
    if (value.length > 2048) return 'La URL es demasiada larga'
    return true
  }
}

/**
 * Configuración para react-hook-form con validación real-time
 */
export const linkFormRules = {
  url: {
    required: 'La URL es obligatoria',
    validate: {
      format: (value) => linkValidators.isValidUrl(value) || 'URL inválida',
      length: (value) => value.length <= 2048 || 'La URL es demasiado larga'
      // Por ahora no incluimos async uniqueness check para evitar latency
      // Se puede agregar si es necesario con debounce
    }
  },
  title: {
    maxLength: { value: 200, message: 'El título no puede exceder 200 caracteres' }
  },
  description: {
    maxLength: { value: 1000, message: 'La descripción no puede exceder 1000 caracteres' }
  },
  tags: {
    validate: (value) => linkValidators.validateTags(value)
  }
}

/**
 * Normalizar URL
 */
export const normalizeUrl = (url) => {
  if (!url) return ''
  return url.startsWith('http') ? url : `https://${url}`
}
