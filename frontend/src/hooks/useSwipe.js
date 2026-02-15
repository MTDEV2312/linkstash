import { useRef, useEffect, useCallback } from 'react'

/**
 * Hook para detectar gestos de swipe en elementos
 * @param onSwipeLeft - Callback cuando se desliza a la izquierda
 * @param onSwipeRight - Callback cuando se desliza a la derecha
 * @param minDistance - Distancia mínima para considerar como swipe (px, default 50)
 * @returns ref a aplicar al elemento
 */
export const useSwipe = (
  onSwipeLeft,
  onSwipeRight,
  { minDistance = 50 } = {}
) => {
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const ref = useRef(null)

  const handleSwipe = useCallback(() => {
    const distance = touchStartX.current - touchEndX.current
    
    // Swipe a la izquierda
    if (distance > minDistance) {
      onSwipeLeft?.()
    }
    
    // Swipe a la derecha
    if (distance < -minDistance) {
      onSwipeRight?.()
    }
  }, [minDistance, onSwipeLeft, onSwipeRight])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleTouchStart = (e) => {
      touchStartX.current = e.changedTouches[0].screenX
    }

    const handleTouchEnd = (e) => {
      touchEndX.current = e.changedTouches[0].screenX
      handleSwipe()
    }

    element.addEventListener('touchstart', handleTouchStart, false)
    element.addEventListener('touchend', handleTouchEnd, false)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart, false)
      element.removeEventListener('touchend', handleTouchEnd, false)
    }
  }, [handleSwipe])

  return ref
}

/**
 * Hook para detectar swipe vertical
 * @param onSwipeUp - Callback cuando se desliza hacia arriba
 * @param onSwipeDown - Callback cuando se desliza hacia abajo
 * @param minDistance - Distancia mínima para considerar como swipe (px, default 50)
 * @returns ref a aplicar al elemento
 */
export const useSwipeVertical = (
  onSwipeUp,
  onSwipeDown,
  { minDistance = 50 } = {}
) => {
  const touchStartY = useRef(0)
  const touchEndY = useRef(0)
  const ref = useRef(null)

  const handleSwipe = useCallback(() => {
    const distance = touchStartY.current - touchEndY.current
    
    // Swipe hacia arriba
    if (distance > minDistance) {
      onSwipeUp?.()
    }
    
    // Swipe hacia abajo
    if (distance < -minDistance) {
      onSwipeDown?.()
    }
  }, [minDistance, onSwipeUp, onSwipeDown])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleTouchStart = (e) => {
      touchStartY.current = e.changedTouches[0].screenY
    }

    const handleTouchEnd = (e) => {
      touchEndY.current = e.changedTouches[0].screenY
      handleSwipe()
    }

    element.addEventListener('touchstart', handleTouchStart, false)
    element.addEventListener('touchend', handleTouchEnd, false)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart, false)
      element.removeEventListener('touchend', handleTouchEnd, false)
    }
  }, [handleSwipe])

  return ref
}

/**
 * Hook para long press (presión sostenida)
 * @param onLongPress - Callback cuando se presiona por más de duration ms
 * @param duration - Tiempo de presión en ms (default 500)
 * @returns ref a aplicar al elemento
 */
export const useLongPress = (onLongPress, { duration = 500 } = {}) => {
  const timeoutRef = useRef(null)
  const ref = useRef(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleTouchStart = () => {
      timeoutRef.current = setTimeout(() => {
        onLongPress?.()
      }, duration)
    }

    const handleTouchEnd = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }

    element.addEventListener('touchstart', handleTouchStart)
    element.addEventListener('touchend', handleTouchEnd)
    element.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [duration, onLongPress])

  return ref
}
