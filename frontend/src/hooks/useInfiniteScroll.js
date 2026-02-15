import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook para detectar cuando el usuario está cerca del final de una lista
 * y ejecutar una callback (típicamente para cargar más items)
 * 
 * Usa Intersection Observer API para máximo performance
 */
export const useInfiniteScroll = (
  onLoadMore,
  { threshold = 0.5, rootMargin = '100px' } = {}
) => {
  const sentinelRef = useRef(null)
  const observerRef = useRef(null)
  const observingRef = useRef(false)

  useEffect(() => {
    if (!sentinelRef.current || typeof onLoadMore !== 'function') return

    // Crear observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Solo cargar una vez
          if (entry.isIntersecting && !observingRef.current) {
            observingRef.current = true
            onLoadMore()
            // Reset después de un pequeño delay para permitir que se agreguen items
            setTimeout(() => {
              observingRef.current = false
            }, 300)
          }
        })
      },
      {
        threshold,
        rootMargin
      }
    )

    // Observar sentinel
    observerRef.current.observe(sentinelRef.current)

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [onLoadMore, threshold, rootMargin])

  return sentinelRef
}

/**
 * Hook para prefetch de la siguiente página en MyCls
 * Se ejecuta automáticamente cuando el usuario está cerca del final
 */
export const usePrefetchNextPage = (
  canLoadMore,
  isLoading,
  onPrefetch
) => {
  const prefetchTimeoutRef = useRef(null)
  const lastPrefetchRef = useRef(null)

  const handlePrefetch = useCallback(() => {
    // No prefetchear si ya está cargando o no hay más páginas
    if (isLoading || !canLoadMore) return

    // Evitar múltiples prefetch en corto tiempo
    if (lastPrefetchRef.current && Date.now() - lastPrefetchRef.current < 500) {
      return
    }

    // Debounce el prefetch
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
    }

    prefetchTimeoutRef.current = setTimeout(() => {
      if (typeof onPrefetch === 'function') {
        lastPrefetchRef.current = Date.now()
        onPrefetch()
      }
    }, 200)
  }, [canLoadMore, isLoading, onPrefetch])

  // Cleanup
  useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current)
      }
    }
  }, [])

  return handlePrefetch
}
