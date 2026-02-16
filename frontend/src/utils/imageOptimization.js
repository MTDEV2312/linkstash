/**
 * Utilidades para optimización de imágenes desde Cloudinary
 * Transforma URLs para servir imágenes responsive con compresión automática
 */

/**
 * Normaliza URLs de imagen para Cloudinary cuando solo se recibe el nombre del archivo
 * @param {string} url - URL o nombre de archivo
 * @param {Object} options - Opciones de normalizacion
 * @returns {string} - URL normalizada
 */
export const normalizeImageUrl = (url, options = {}) => {
  if (!url) return ''

  const { isCloudinary = false } = options
  const isAbsolute = /^(https?:)?\/\//i.test(url) || /^data:/i.test(url) || /^blob:/i.test(url)
  if (isAbsolute) return url

  if (!isCloudinary) return url

  const cloudName =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ||
    import.meta.env.VITE_CLOUDINARY_CLOUDNAME ||
    'dfbvqnqgt'

  if (!cloudName) return url

  let path = url.replace(/^\/+/, '')
  if (!path.includes('/')) {
    path = `linkstash/${path}`
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/${path}`
}

/**
 * Obtiene una URL optimizada de Cloudinary para un tamaño específico
 * @param {string} url - URL original de Cloudinary o externa
 * @param {number} width - Ancho deseado en pixels
 * @param {number} quality - Calidad de compresión (1-100, default 80)
 * @returns {string} - URL optimizada
 */
export const getOptimizedImageUrl = (url, width = 400, quality = 80) => {
  if (!url) return ''

  const normalized = normalizeImageUrl(url)

  // Si es una URL de Cloudinary, usar la URL original sin transformaciones
  // para evitar 404 en cuentas donde los transforms no estan disponibles.
  if (normalized.includes('cloudinary.com')) {
    return normalized
  }

  try {
    // Formato de URL de Cloudinary: https://res.cloudinary.com/{cloud_name}/{type}/{upload_id}
    // Insertar transformaciones entre "upload" y el ID del archivo
    const cloudinaryRegex = /^(https:\/\/res\.cloudinary\.com\/[^/]+)\/image\/upload\//
    
    if (!cloudinaryRegex.test(normalized)) {
      return normalized
    }

    // Construir transformaciones: w_{width},c_limit,q_{quality},f_auto
    // w_{width},c_limit = redimensionar manteniendo aspecto
    // q_{quality} = calidad (1-100)
    // f_auto = formato automático (webp para navegadores compatibles)
    const transformation = `w_${width},c_limit,q_${quality},f_auto`

    // Insertar transformación
    return normalized.replace(/\/upload\//, `/upload/${transformation}/`)
  } catch (error) {
    console.error('Error optimizando URL de imagen:', error)
    return normalized
  }
}

/**
 * Normaliza URLs de imagen para Cloudinary cuando solo se recibe el nombre del archivo
 * @param {string} url - URL o nombre de archivo
 * @param {Object} options - Opciones de normalizacion
 * @returns {string} - URL normalizada
 */

/**
 * Genera srcSet responsive para diferentes resoluções
 * @param {string} url - URL original de Cloudinary
 * @param {Object} options - Opciones de configuración
 * @returns {string} - srcSet string para img tag
 */
export const getResponsiveSrcSet = (
  url,
  options = {}
) => {
  const {
    sizes = [300, 600, 900, 1200],
    quality = 80,
    format = 'auto'
  } = options

  if (!url) return ''

  try {
    return sizes
      .map(size => {
        const optimized = getOptimizedImageUrl(url, size, quality)
        return `${optimized} ${size}w`
      })
      .join(', ')
  } catch (error) {
    console.error('Error generando srcSet:', error)
    return ''
  }
}

/**
 * Genera tamaños media queries para responsive images
 * @param {Object} options - Opciones de breakpoints
 * @returns {string} - sizes attribute para img tag
 */
export const getResponsiveSizes = (options = {}) => {
  const {
    mobile = '(max-width: 640px) 100vw',
    tablet = '(max-width: 1024px) 50vw',
    desktop = '(min-width: 1025px) 33vw'
  } = options

  return `${mobile}, ${tablet}, ${desktop}`
}

/**
 * URL con blur placeholder (para efecto blur mientras carga)
 * Retorna una versión muy comprimida y borrosa
 * @param {string} url - URL original
 * @returns {string} - URL de placeholder
 */
export const getBlurPlaceholderUrl = (url) => {
  if (!url) return ''

  const normalized = normalizeImageUrl(url)

  // Evitar generar placeholder si la imagen es de Cloudinary.
  if (normalized.includes('cloudinary.com')) {
    return ''
  }

  try {
    // Transformación: w_50,c_limit,q_1,f_auto,e_blur:500
    // Imagen muy pequeña, baja calidad, muy borrosa
    const transformation = 'w_50,c_limit,q_1,f_auto,e_blur:500'
    return url.replace(/\/upload\//, `/upload/${transformation}/`)
  } catch (error) {
    console.error('Error generando blur placeholder:', error)
    return url
  }
}

/**
 * Transforma una URL para servir en webp con fallback a original
 * @param {string} url - URL original
 * @param {number} width - Ancho deseado
 * @param {number} quality - Calidad
 * @returns {Object} - {webp, fallback}
 */
export const getWebpAndFallback = (url, width = 400, quality = 80) => {
  if (!url) return { webp: '', fallback: '' }

  try {
    const optimized = getOptimizedImageUrl(url, width, quality)
    
    // Para webp, reemplazar f_auto con f_webp
    const webp = optimized.replace(/f_auto/, 'f_webp')
    
    return {
      webp,
      fallback: optimized
    }
  } catch (error) {
    console.error('Error generando webp y fallback:', error)
    return { webp: url, fallback: url }
  }
}

/**
 * Obtiene dimensiones sugeridas para un container
 * Útil para evitar layout shift
 * @param {number} containerWidth - Ancho del contenedor
 * @param {number} aspectRatio - Aspecto (default 16/9)
 * @returns {Object} - {width, height}
 */
export const getImageDimensions = (containerWidth = 400, aspectRatio = 16 / 9) => {
  return {
    width: containerWidth,
    height: Math.round(containerWidth / aspectRatio)
  }
}
