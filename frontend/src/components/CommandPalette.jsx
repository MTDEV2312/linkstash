import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ExternalLink, Bookmark, Tag, Home, Settings, ArrowRight, CornerDownLeft } from 'lucide-react'
import { useLinkStore } from '../stores/linkStore'

const SECTIONS = [
  { id: 'dashboard', title: 'Dashboard', path: '/dashboard', icon: Home, hint: 'G D' },
  { id: 'links', title: 'Mis Enlaces', path: '/mylinks', icon: Bookmark, hint: 'G L' },
  { id: 'tags', title: 'Etiquetas', path: '/tags', icon: Tag, hint: 'G T' },
  { id: 'settings', title: 'Configuración', path: '/settings', icon: Settings, hint: 'G S' },
]

const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()

  const linksById = useLinkStore((state) => state.linksById)
  const linkIds = useLinkStore((state) => state.linkIds)
  const allLinks = useLinkStore((state) => state.links)

  const links = useMemo(() => {
    if (Array.isArray(linkIds) && linksById) {
      return linkIds.map((id) => linksById[id]).filter(Boolean)
    }
    if (Array.isArray(allLinks)) {
      return allLinks
    }
    return []
  }, [linkIds, linksById, allLinks])

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Filter sections and links based on query
  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SECTIONS
    return SECTIONS.filter((s) => s.title.toLowerCase().includes(q))
  }, [query])

  const filteredLinks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return links.slice(0, 5)
    return links.filter((link) => {
      const titleMatch = link.title?.toLowerCase().includes(q)
      const urlMatch = link.url?.toLowerCase().includes(q)
      const tagMatch = Array.isArray(link.tags) && link.tags.some((tag) => {
        const name = typeof tag === 'object' && tag !== null ? tag.name : tag
        return String(name).toLowerCase().includes(q)
      })
      return titleMatch || urlMatch || tagMatch
    }).slice(0, 8)
  }, [links, query])

  // Combine items for keyboard navigation
  const allItems = useMemo(() => {
    const items = []
    filteredSections.forEach((s) => {
      items.push({
        type: 'section',
        id: s.id,
        title: s.title,
        icon: s.icon,
        hint: s.hint,
        action: () => {
          navigate(s.path)
          onClose()
        }
      })
    })

    filteredLinks.forEach((link) => {
      items.push({
        type: 'link',
        id: link._id,
        title: link.title || link.url,
        url: link.url,
        icon: Bookmark,
        action: () => {
          window.open(link.url, '_blank', 'noopener,noreferrer')
          onClose()
        }
      })
    })

    return items
  }, [filteredSections, filteredLinks, navigate, onClose])

  // Clamp selected index
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (allItems.length === 0) return 0
      return Math.min(prev, allItems.length - 1)
    })
  }, [allItems])

  // Keyboard navigation inside modal
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (allItems.length > 0 ? (prev + 1) % allItems.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (allItems.length > 0 ? (prev - 1 + allItems.length) % allItems.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action()
      }
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]')
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  if (!isOpen) return null

  const isUrl = query.trim().startsWith('http://') || query.trim().startsWith('https://')

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="relative w-full max-w-xl bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--border)] gap-3 bg-[var(--surface)]">
          <Search className="w-5 h-5 text-[var(--muted)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none text-[var(--text)] text-sm placeholder:text-[var(--subtle)] focus:outline-none focus:ring-0"
            placeholder="Buscar enlaces, secciones o escribir comando..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 border border-[var(--border)] rounded text-[var(--muted)] bg-[var(--surface-2)]">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div ref={listRef} className="overflow-y-auto p-2 divide-y divide-[var(--border)]/40 flex-1">
          {isUrl && (
            <div className="p-2">
              <span className="mono text-[9px] text-[var(--accent)] uppercase font-semibold block mb-1.5 px-2">
                URL detectada
              </span>
              <button
                type="button"
                className="w-full flex items-center justify-between p-2.5 rounded hover:bg-[var(--surface-2)] text-left transition-colors"
                onClick={() => {
                  window.open(query.trim(), '_blank', 'noopener,noreferrer')
                  onClose()
                }}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <ExternalLink className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
                  <span className="text-xs text-[var(--text)] font-mono truncate">{query.trim()}</span>
                </div>
                <CornerDownLeft className="w-3.5 h-3.5 text-[var(--muted)]" />
              </button>
            </div>
          )}

          {/* Quick Actions / Sections */}
          {filteredSections.length > 0 && (
            <div className="p-1">
              <span className="mono text-[9px] text-[var(--muted)] uppercase font-semibold block px-2 py-1">
                Navegación rápida
              </span>
              <div className="space-y-0.5">
                {filteredSections.map((section) => {
                  const itemIndex = allItems.findIndex((it) => it.id === section.id && it.type === 'section')
                  const isActive = itemIndex === selectedIndex
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      type="button"
                      data-active={isActive}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-xs transition-colors ${
                        isActive
                          ? 'bg-[var(--surface-3)] text-[var(--text)] font-medium'
                          : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
                      }`}
                      onClick={() => {
                        navigate(section.path)
                        onClose()
                      }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} />
                        <span>{section.title}</span>
                      </div>
                      <kbd className="mono text-[9px] text-[var(--muted)]">{section.hint}</kbd>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Saved Links */}
          {filteredLinks.length > 0 && (
            <div className="p-1">
              <span className="mono text-[9px] text-[var(--muted)] uppercase font-semibold block px-2 py-1">
                {query ? 'Enlaces coincidentes' : 'Enlaces recientes'}
              </span>
              <div className="space-y-0.5">
                {filteredLinks.map((link) => {
                  const itemIndex = allItems.findIndex((it) => it.id === link._id && it.type === 'link')
                  const isActive = itemIndex === selectedIndex
                  return (
                    <button
                      key={link._id}
                      type="button"
                      data-active={isActive}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-xs transition-colors ${
                        isActive
                          ? 'bg-[var(--surface-3)] text-[var(--text)]'
                          : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
                      }`}
                      onClick={() => {
                        window.open(link.url, '_blank', 'noopener,noreferrer')
                        onClose()
                      }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                    >
                      <div className="flex items-center gap-2.5 truncate max-w-[85%]">
                        <Bookmark className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} />
                        <span className="truncate font-medium">{link.title || link.url}</span>
                        <span className="text-[10px] text-[var(--muted)] font-mono truncate hidden sm:inline">
                          {link.url}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--muted)] flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {allItems.length === 0 && !isUrl && (
            <div className="py-8 text-center text-xs text-[var(--muted)]">
              No se encontraron resultados para &quot;{query}&quot;
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between text-[10px] font-mono text-[var(--muted)]">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-[9px]">↑↓</kbd> Navegar</span>
            <span><kbd className="px-1 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-[9px]">↵</kbd> Abrir</span>
            <span><kbd className="px-1 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-[9px]">ESC</kbd> Cerrar</span>
          </div>
          <span className="text-[var(--accent)]">LINKSTASH ARCHIVE</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
