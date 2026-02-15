import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLinkStore } from '../stores/linkStore'

/**
 * Hook para manejar atajos de teclado globales en LinkStash
 * 
 * Atajos:
 * - Cmd/Ctrl + K: Enfocar búsqueda
 * - Cmd/Ctrl + N: Crear nuevo enlace
 * - Cmd/Ctrl + /: Mostrar ayuda
 * - Escape: Cerrar sin guardar (cuando está editando)
 */
export const useKeyboardShortcuts = (options = {}) => {
  const navigate = useNavigate()
  const { onSearchFocus = null, onNewLink = null, onHelp = null } = options

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ignorar si el usuario está escribiendo en inputs excluidos de atajos
      const isInputActive = 
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement?.tagName === 'INPUT' && 
         !document.activeElement?.getAttribute('data-shortcut-enabled'))

      // Para Cmd+K, permitir incluso si hay input (para cambiar foco)
      const isShortcutKey = 
        (event.ctrlKey || event.metaKey) && 
        ['k', 'n', '/'].includes(event.key.toLowerCase())

      if (isInputActive && !isShortcutKey) {
        return
      }

      // Cmd/Ctrl + K: Enfocar búsqueda
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        if (onSearchFocus) {
          onSearchFocus()
        }
      }

      // Cmd/Ctrl + N: Crear nuevo enlace
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault()
        if (onNewLink) {
          onNewLink()
        }
      }

      // Cmd/Ctrl + /: Mostrar ayuda (toggle)
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault()
        if (onHelp) {
          onHelp()
        }
      }

      // Alt + A: Mostrar/ocultar archivados
      if (event.altKey && event.key === 'a') {
        event.preventDefault()
        const { filters, setFilters } = useLinkStore.getState()
        setFilters({ archived: !filters.archived })
      }

      // Alt + F: Mostrar/ocultar favoritos
      if (event.altKey && event.key === 'f') {
        event.preventDefault()
        const { filters, setFilters } = useLinkStore.getState()
        const currentFavorite = filters.favorite
        setFilters({ favorite: currentFavorite === true ? null : true })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSearchFocus, onNewLink, onHelp])
}

/**
 * Mapa de atajos de teclado para mostrar en help modal
 */
export const KeyboardShortcuts = {
  SEARCH: {
    key: 'Cmd + K',
    description: 'Enfocar búsqueda',
    platforms: ['mac', 'linux', 'windows']
  },
  NEW_LINK: {
    key: 'Cmd + N',
    description: 'Crear nuevo enlace',
    platforms: ['mac', 'linux', 'windows']
  },
  HELP: {
    key: 'Cmd + /',
    description: 'Mostrar ayuda de atajos',
    platforms: ['mac', 'linux', 'windows']
  },
  TOGGLE_ARCHIVED: {
    key: 'Alt + A',
    description: 'Mostrar/ocultar archivados',
    platforms: ['mac', 'linux', 'windows']
  },
  TOGGLE_FAVORITES: {
    key: 'Alt + F',
    description: 'Mostrar/ocultar favoritos',
    platforms: ['mac', 'linux', 'windows']
  }
}
