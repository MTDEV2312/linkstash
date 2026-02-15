import { memo, useEffect, useState } from 'react'
import { getOptimizedImageUrl, getBlurPlaceholderUrl, normalizeImageUrl } from '../utils/imageOptimization'

/**
 * Componente optimizado para lazy loading de imágenes
 * Proporciona blur placeholder mientras carga
 */
const OptimizedImage = memo(({
  src,
  alt = '',
  width = 400,
  height = 300,
  className = 'w-full h-full object-cover',
  quality = 80,
  isCloudinary = false,
  onLoad,
  onError,
  eager = false,
  ...props
}) => {
  const normalizedSrc = normalizeImageUrl(src, { isCloudinary })
  const optimized = getOptimizedImageUrl(normalizedSrc, width, quality)
  const placeholder = getBlurPlaceholderUrl(normalizedSrc)
  const [useOptimized, setUseOptimized] = useState(optimized && optimized !== normalizedSrc)

  useEffect(() => {
    setUseOptimized(optimized && optimized !== normalizedSrc)
  }, [optimized, normalizedSrc])

  const handleError = (event) => {
    if (useOptimized && normalizedSrc && optimized && optimized !== normalizedSrc) {
      setUseOptimized(false)
      return
    }
    onError?.(event)
  }

  return (
    <picture>
      {useOptimized && (
        <source
          srcSet={optimized}
          type="image/webp"
        />
      )}
      <img
        src={useOptimized ? optimized : normalizedSrc}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={onLoad}
        onError={handleError}
        style={{
          backgroundImage: placeholder ? `url(${placeholder})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
        {...props}
      />
    </picture>
  )
})

OptimizedImage.displayName = 'OptimizedImage'

export default OptimizedImage
