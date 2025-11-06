import { useState, useRef, useEffect } from 'react'
import { Search, X, Filter } from 'lucide-react'

const SearchBar = ({ onSearch, initialValue = '', placeholder = 'Buscar enlaces...' }) => {
  const [searchTerm, setSearchTerm] = useState(initialValue)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef(null)
  
  // Debounce para búsqueda automática
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== initialValue) {
        onSearch(searchTerm)
      }
    }, 300) // 300ms de delay

    return () => clearTimeout(timeoutId)
  }, [searchTerm, onSearch, initialValue])

  // Actualizar cuando cambie el valor inicial
  useEffect(() => {
    setSearchTerm(initialValue)
  }, [initialValue])

  const handleClear = () => {
    setSearchTerm('')
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
            <Search className={`h-5 w-5 transition-colors duration-200 ${
              isFocused ? 'text-primary-500' : 'text-gray-400'
            }`} />
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            placeholder={placeholder}
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
                    setSearchTerm(`${searchTerm} tutorial`)
                    onSearch(`${searchTerm} tutorial`)
                  }}
                  className="block w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  {searchTerm} tutorial
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm(`${searchTerm} docs`)
                    onSearch(`${searchTerm} docs`)
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
      <div className="mt-2 text-xs text-gray-500 text-center">
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
