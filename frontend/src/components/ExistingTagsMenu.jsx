import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Tag as TagIcon, X } from 'lucide-react'

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
  helperText = 'Asigna etiquetas de tu catálogo para organizar este enlace.'
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
      {label && (
        <label className="block text-xs font-mono font-medium text-[var(--muted)] tracking-wider">
          {label.toUpperCase()}
        </label>
      )}

      <button
        type="button"
        data-testid="tag-select"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between text-left min-h-[46px] px-3.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs text-[var(--text)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 text-xs font-mono text-[var(--text)]">
          <TagIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
          {normalizedSelectedTags.length > 0
            ? `${normalizedSelectedTags.length} seleccionada${normalizedSelectedTags.length > 1 ? 's' : ''}`
            : 'Seleccionar etiquetas existentes'}
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="border border-[var(--border-strong)] rounded-lg bg-[var(--surface)] shadow-xl overflow-hidden animate-fade-in z-30 relative">
          {normalizedOptions.length === 0 ? (
            <p className="p-3 text-xs font-mono text-[var(--muted)]">{emptyText}</p>
          ) : (
            <div className="max-h-52 overflow-y-auto py-1 divide-y divide-[var(--border)]">
              {normalizedOptions.map((tagName) => {
                const isSelected = selectedSet.has(tagName)
                return (
                  <button
                    key={tagName}
                    type="button"
                    onClick={() => toggleTag(tagName)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-mono hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                  >
                    <span className="truncate text-[var(--text)]">#{tagName}</span>
                    {isSelected && <Check className="w-4 h-4 text-[var(--accent)]" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {normalizedSelectedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {normalizedSelectedTags.map((tagName) => (
            <span
              key={tagName}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]"
            >
              <span className="text-[var(--accent)]">#</span>
              <span>{tagName}</span>
              <button
                type="button"
                onClick={() => toggleTag(tagName)}
                className="text-[var(--muted)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                aria-label={`Quitar etiqueta ${tagName}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] font-mono text-[var(--muted)] hover:text-[var(--danger)] transition-colors ml-1 cursor-pointer"
          >
            Limpiar
          </button>
        </div>
      )}

      {helperText && (
        <p className="text-[11px] font-mono text-[var(--muted)]">{helperText}</p>
      )}
    </div>
  )
}

export default ExistingTagsMenu