import { memo, useState, useEffect } from 'react'
import { getOptimizedImageUrl, getBlurPlaceholderUrl, normalizeImageUrl } from '../utils/imageOptimization'

export const LOCAL_FALLBACK_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj4KICA8cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNGM0Y0RjYiIHJ4PSI4Ii8+CiAgPHBhdGggZD0iTTM1IDQ4TDMwIDQzTDIyIDUxaDM2TDUwIDQwTDM1IDQ4eiIgZmlsbD0iI0QxRDVREIi8+CiAgPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIgZmlsbD0iI0QxRDVREIi8+Cjwvc3ZnPg=='

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
  isStored = false,
  isCloudinary = false,
  onLoad,
  onError,
  eager = false,
  ...props
}) => {
  const [status, setStatus] = useState(() => src ? 'loading' : 'fallback-backend')

  useEffect(() => {
    setStatus(src ? 'loading' : 'fallback-backend')
  }, [src])

  const normalizedSrc = normalizeImageUrl(src, { isStored, isCloudinary })
  const optimized = getOptimizedImageUrl(normalizedSrc, width, quality)
  const placeholder = getBlurPlaceholderUrl(normalizedSrc)
  const useOptimized = Boolean(optimized && optimized !== normalizedSrc)

  let currentSrc = useOptimized ? optimized : normalizedSrc
  if (status === 'fallback-backend') {
    currentSrc = (import.meta.env.VITE_BACK_URL || '') + '/defaults/default-image.png'
  } else if (status === 'fallback-local' || status === 'terminal-error') {
    currentSrc = LOCAL_FALLBACK_SVG
  }

  const handleLoad = (event) => {
    setStatus('loaded')
    onLoad?.(event)
  }

  const handleError = (event) => {
    if (status === 'loading') {
      setStatus('fallback-backend')
      onError?.(event)
    } else if (status === 'fallback-backend') {
      setStatus('fallback-local')
      onError?.(event)
    } else if (status === 'fallback-local') {
      setStatus('terminal-error')
      console.error('Terminal error: fallback image failed to load.')
      onError?.(event)
    } else if (status === 'terminal-error') {
      event.preventDefault()
    }
  }

  const formatDimension = (dim) => {
    if (typeof dim === 'number' || !isNaN(Number(dim))) {
      return `${dim}px`
    }
    return dim
  }

  const isShowSkeleton = status !== 'loaded' && status !== 'terminal-error'

  return (
    <>
      {isShowSkeleton && (
        <div
          data-testid="optimized-image-skeleton"
          className={`${className} animate-pulse bg-gray-200 dark:bg-gray-700`}
          style={{
            width: formatDimension(width),
            height: formatDimension(height)
          }}
        />
      )}
      <picture style={{ display: isShowSkeleton ? 'none' : 'block' }}>
        {useOptimized && status === 'loading' && (
          <source
            srcSet={optimized}
            type="image/webp"
          />
        )}
        <img
          src={currentSrc}
          alt={alt}
          className={className}
          width={width}
          height={height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          data-status={status}
          style={{
            backgroundImage: placeholder && status === 'loading' ? `url(${placeholder})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: isShowSkeleton ? 'none' : 'block'
          }}
          {...props}
        />
      </picture>
    </>
  )
})

OptimizedImage.displayName = 'OptimizedImage'

export default OptimizedImage
