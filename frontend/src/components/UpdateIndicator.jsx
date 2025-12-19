import { useEffect, useState } from 'react'

/**
 * Indicador sutil de actualización: barra superior animada
 * Se muestra cuando isUpdating es true, desaparece suavemente cuando es false
 * Compatible con Dark Mode, accesible y sin flicker
 */
const UpdateIndicator = ({ isUpdating = false }) => {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isUpdating) {
      setShow(true)
    } else {
      // Delay para permitir que la animación de fade-out se vea
      const timer = setTimeout(() => setShow(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isUpdating])

  if (!show) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500 transition-opacity duration-300 z-40 ${
        isUpdating ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        animation: isUpdating ? 'shimmer 2s infinite' : 'none',
      }}
      role="status"
      aria-label="Actualizando datos"
      aria-live="polite"
    >
      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default UpdateIndicator
