import { memo, useState, useEffect } from 'react'
import { getOptimizedImageUrl, getBlurPlaceholderUrl, normalizeImageUrl } from '../utils/imageOptimization'

export const LOCAL_FALLBACK_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNGM0Y0RjYiIHJ4PSI4Ii8+PHBhdGggZD0iTTM1IDQ4TDMwIDQzTDIyIDUxaDM2TDUwIDQwTDM1IDQ4eiIgZmlsbD0iI0QxRDVEQiIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjQiIGZpbGw9IiNEMUQ1REIiLz48L3N2Zz4='

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
  const [srcTier, setSrcTier] = useState(() => src ? 'primary' : 'backend')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setSrcTier(src ? 'primary' : 'backend')
    setIsLoaded(false)
  }, [src])

  const normalizedSrc = normalizeImageUrl(src, { isStored, isCloudinary })
  const optimized = getOptimizedImageUrl(normalizedSrc, width, quality)
  const placeholder = getBlurPlaceholderUrl(normalizedSrc)
  const useOptimized = Boolean(optimized && optimized !== normalizedSrc)

  let currentSrc = useOptimized ? optimized : normalizedSrc
  if (srcTier === 'backend') {
    currentSrc = (import.meta.env.VITE_BACK_URL || '') + '/defaults/default-image.png'
  } else if (srcTier === 'local' || srcTier === 'terminal-error') {
    currentSrc = LOCAL_FALLBACK_SVG
  }

  const handleLoad = (event) => {
    setIsLoaded(true)
    onLoad?.(event)
  }

  const handleError = (event) => {
    if (srcTier === 'primary') {
      setSrcTier('backend')
      setIsLoaded(false)
      onError?.(event)
    } else if (srcTier === 'backend') {
      setSrcTier('local')
      setIsLoaded(false)
      onError?.(event)
    } else if (srcTier === 'local') {
      setSrcTier('terminal-error')
      setIsLoaded(false)
      console.error('Terminal error: fallback image failed to load.')
      onError?.(event)
    } else if (srcTier === 'terminal-error') {
      event.preventDefault()
    }
  }

  const isShowSkeleton = !isLoaded && srcTier !== 'terminal-error'

  const getMappedStatus = () => {
    if (srcTier === 'primary') return 'loading'
    if (srcTier === 'backend') return 'fallback-backend'
    if (srcTier === 'local') return 'fallback-local'
    return 'terminal-error'
  }

  const aspectRatio = width && height ? `${width} / ${height}` : undefined

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio }}
    >
      {isShowSkeleton && (
        <div
          data-testid="optimized-image-skeleton"
          className="animate-pulse bg-gray-200 dark:bg-gray-700 absolute inset-0 w-full h-full rounded-[inherit]"
        />
      )}
      <picture className="w-full h-full block rounded-[inherit]">
        {useOptimized && srcTier === 'primary' && (
          <source
            srcSet={optimized}
            type="image/webp"
          />
        )}
        <img
          src={currentSrc}
          alt={alt}
          className="w-full h-full object-cover rounded-[inherit]"
          width={width}
          height={height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          data-status={getMappedStatus()}
          style={{
            backgroundImage: placeholder && srcTier === 'primary' ? `url(${placeholder})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: isShowSkeleton ? 0 : 1,
            transition: 'opacity 0.2s ease-in-out'
          }}
          {...props}
        />
      </picture>
    </div>
  )
})

OptimizedImage.displayName = 'OptimizedImage'

export default OptimizedImage
