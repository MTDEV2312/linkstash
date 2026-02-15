import { useEffect, useRef } from 'react'

/**
 * Hook personalizado para implementar focus trap en modales y diálogos
 * Asegura que el focus permanezca dentro del elemento especificado
 * y restaura el focus anterior cuando el modal se cierra
 * 
 * @param {boolean} isActive - Si el focus trap está activo
 * @returns {React.MutableRefObject} - Ref para el contenedor del modal
 */
export const useFocusTrap = (isActive = true) => {
  const containerRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!isActive) return

    // Guardar el elemento que tenía el focus antes de abrir el modal
    previousFocusRef.current = document.activeElement

    // Enfocar el modal al abrirse
    if (containerRef.current) {
      containerRef.current.focus()
    }

    // Función para manejar el Tab key y mantener el focus dentro del modal
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab' || !containerRef.current) return

      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // Si presiona Shift+Tab en el primer elemento, mover a último
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
      // Si presiona Tab en el último elemento, mover a primero
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      
      // Restaurar el focus al elemento anterior cuando el modal se cierra
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus()
      }
    }
  }, [isActive])

  return containerRef
}
