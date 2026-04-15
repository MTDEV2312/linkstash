import { useState, useRef, useEffect } from 'react'
import { Search, X, Filter } from 'lucide-react'

const SearchBar = ({ onSearch, defaultValue = '', placeholder = 'Buscar enlaces...' }) => {
  const [searchTerm, setSearchTerm] = useState(() => defaultValue)
  const [isFocused, setIsFocused] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const abortControllerRef = useRef(null)

  const scheduleSearch = (nextSearchTerm) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (nextSearchTerm === defaultValue) {
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    searchTimeoutRef.current = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      try {
        await onSearch(nextSearchTerm, abortControllerRef.current.signal)
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.error('Error en búsqueda:', error)
        }
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Atajo de teclado: Cmd+K or Ctrl+K para enfocar (manejado en useKeyboardShortcuts)
  // Este efecto se mantiene por compatibilidad, pero ahora también marcamos el input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleClear = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setSearchTerm('')
    setIsSearching(false)
    onSearch('')
    inputRef.current?.focus()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch(searchTerm)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClear()
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className={`relative flex items-center transition-all duration-200 ${
          isFocused ? 'ring-2 ring-primary-500 ring-opacity-50' : ''
        }`}>
          {/* Icono de búsqueda */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isSearching ? (
              <div className="animate-spin">
                <Search className="h-5 w-5 text-primary-500" />
              </div>
            ) : (
              <Search className={`h-5 w-5 transition-colors duration-200 ${
                isFocused ? 'text-primary-500' : 'text-gray-400'
              }`} />
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              const nextSearchTerm = e.target.value
              setSearchTerm(nextSearchTerm)
              scheduleSearch(nextSearchTerm)
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            placeholder={placeholder}
            aria-label="Buscar enlaces por título, URL o descripción"
            aria-describedby="search-tips"
            aria-autocomplete="none"
            data-shortcut-enabled="true"
          />

          {/* Botón de limpiar */}
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Sugerencias de búsqueda (opcional) */}
        {isFocused && searchTerm && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="p-3">
              <div className="text-xs text-gray-500 mb-2">Sugerencias:</div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    const nextSearchTerm = `${searchTerm} tutorial`
                    setSearchTerm(nextSearchTerm)
                    scheduleSearch(nextSearchTerm)
                  }}
                  className="block w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  {searchTerm} tutorial
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextSearchTerm = `${searchTerm} docs`
                    setSearchTerm(nextSearchTerm)
                    scheduleSearch(nextSearchTerm)
                  }}
                  className="block w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  {searchTerm} docs
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Información de búsqueda */}
      {searchTerm && (
        <div className="mt-2 text-sm text-gray-600 text-center">
          Buscando: <span className="font-medium text-gray-900">"{searchTerm}"</span>
          <button
            onClick={handleClear}
            className="ml-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Atajos de teclado */}
      <div className="mt-2 text-xs text-gray-500 text-center" id="search-tips">
        <span className="inline-flex items-center">
          <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
            ⌘ + K
          </kbd>
          <span className="ml-1">para enfocar</span>
        </span>
        <span className="mx-2">•</span>
        <span className="inline-flex items-center">
          <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
            Esc
          </kbd>
          <span className="ml-1">para limpiar</span>
        </span>
      </div>
    </div>
  )
}

export default SearchBar
