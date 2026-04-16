import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Tag, X } from 'lucide-react'

const EMPTY_TAGS = []

const normalizeTagName = (tag) => {
  if (!tag) return ''
  if (typeof tag === 'string') return tag.trim()
  return (tag.name || '').trim()
}

const normalizeSelectedTags = (tags, allowedTags) => {
  const allowedSet = new Set(allowedTags)

  return [...new Set((Array.isArray(tags) ? tags : [])
    .flatMap((tag) => {
      const normalized = normalizeTagName(tag)
      if (!normalized) return []
      if (allowedSet.size > 0 && !allowedSet.has(normalized)) return []
      return [normalized]
    }))]
}

const ExistingTagsMenu = ({
  availableTags = EMPTY_TAGS,
  selectedTags = EMPTY_TAGS,
  onChange,
  label = 'Etiquetas',
  emptyText = 'No hay etiquetas creadas todavía',
  helperText = 'Creá etiquetas desde la pestaña Etiquetas.'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const normalizedOptions = useMemo(() => {
    return availableTags
      .flatMap((tag) => {
        const normalized = normalizeTagName(tag)
        return normalized ? [normalized] : []
      })
      .filter((name, idx, arr) => arr.indexOf(name) === idx)
      .sort((a, b) => a.localeCompare(b))
  }, [availableTags])

  const normalizedSelectedTags = useMemo(
    () => normalizeSelectedTags(selectedTags, normalizedOptions),
    [selectedTags, normalizedOptions]
  )

  const selectedSet = useMemo(() => new Set(normalizedSelectedTags), [normalizedSelectedTags])

  useEffect(() => {
    const handleOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const toggleTag = (tagName) => {
    if (!onChange) return
    if (selectedSet.has(tagName)) {
      onChange(normalizedSelectedTags.filter((tag) => tag !== tagName))
      return
    }
    onChange([...normalizedSelectedTags, tagName])
  }

  const clearAll = () => {
    onChange?.([])
  }

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="input w-full flex items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <Tag className="w-4 h-4 text-gray-400" />
          {normalizedSelectedTags.length > 0
            ? `${normalizedSelectedTags.length} seleccionada${normalizedSelectedTags.length > 1 ? 's' : ''}`
            : 'Seleccionar etiquetas existentes'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-sm">
          {normalizedOptions.length === 0 ? (
            <p className="p-3 text-sm text-gray-500 dark:text-gray-400">{emptyText}</p>
          ) : (
            <div className="max-h-52 overflow-y-auto py-1">
              {normalizedOptions.map((tagName) => {
                const isSelected = selectedSet.has(tagName)
                return (
                  <button
                    key={tagName}
                    type="button"
                    onClick={() => toggleTag(tagName)}
                    className="w-full px-3 py-2 flex items-center justify-between text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <span className="truncate text-gray-700 dark:text-gray-200">{tagName}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary-600" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {normalizedSelectedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {normalizedSelectedTags.map((tagName) => (
            <span
              key={tagName}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200"
            >
              {tagName}
              <button
                type="button"
                onClick={() => toggleTag(tagName)}
                className="hover:text-primary-900 dark:hover:text-white"
                aria-label={`Quitar etiqueta ${tagName}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <button type="button" onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            Limpiar
          </button>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
    </div>
  )
}

export default ExistingTagsMenu