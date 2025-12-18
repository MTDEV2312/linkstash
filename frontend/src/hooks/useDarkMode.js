import { useState, useEffect } from 'react'

/**
 * Hook personalizado para gestionar el modo oscuro con persistencia
 * @returns {[boolean, function]} [isDark, toggleDarkMode]
 */
export const useDarkMode = () => {
  // Determinar el estado inicial
  const getInitialMode = () => {
    // 1. Verificar localStorage primero (preferencia del usuario)
    const savedMode = localStorage.getItem('darkMode')
    if (savedMode !== null) {
      return savedMode === 'true'
    }
    
    // 2. Si no hay preferencia guardada, usar la preferencia del sistema
    if (window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    
    // 3. Por defecto, modo claro
    return false
  }

  const [isDark, setIsDark] = useState(getInitialMode)

  // Aplicar la clase 'dark' al elemento html
  useEffect(() => {
    const root = window.document.documentElement
    
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    
    // Guardar preferencia en localStorage
    localStorage.setItem('darkMode', isDark)
  }, [isDark])

  // Escuchar cambios en la preferencia del sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e) => {
      // Solo cambiar si el usuario no ha establecido una preferencia manual
      const savedMode = localStorage.getItem('darkMode')
      if (savedMode === null) {
        setIsDark(e.matches)
      }
    }

    // Algunos navegadores antiguos no soportan addEventListener en MediaQueryList
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else if (mediaQuery.addListener) {
      // Fallback para navegadores antiguos
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])

  const toggleDarkMode = () => {
    setIsDark(prevMode => !prevMode)
  }

  return [isDark, toggleDarkMode]
}
