import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from '../hooks/useDarkMode'

/**
 * Living Archive theme toggle component
 */
const DarkModeToggle = ({ className = '' }) => {
  const [isDark, toggleDarkMode] = useDarkMode()

  return (
    <button
      onClick={toggleDarkMode}
      type="button"
      className={`
        inline-flex items-center justify-center
        h-9 w-9 rounded
        border border-[var(--border)]
        bg-[var(--surface)]
        text-[var(--muted)]
        hover:text-[var(--text)]
        hover:border-[var(--border-strong)]
        hover:bg-[var(--surface-2)]
        transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
        cursor-pointer
        ${className}
      `}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-[var(--accent)]" />
      ) : (
        <Moon className="h-4 w-4 text-[var(--text)]" />
      )}
    </button>
  )
}

export default DarkModeToggle
