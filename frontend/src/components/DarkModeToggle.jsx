import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from '../hooks/useDarkMode'

/**
 * Componente de toggle para el modo oscuro
 * Puede usarse en el navbar o en la página de configuración
 */
const DarkModeToggle = ({ className = '' }) => {
  const [isDark, toggleDarkMode] = useDarkMode()

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        relative inline-flex items-center justify-center
        p-2 rounded-lg
        transition-all duration-200
        hover:bg-gray-100 dark:hover:bg-gray-700
        focus:outline-none focus:ring-2 focus:ring-primary-500
        ${className}
      `}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-yellow-400" />
      ) : (
        <Moon className="h-5 w-5 text-gray-700" />
      )}
    </button>
  )
}

export default DarkModeToggle
