import { useState, useEffect, useRef, useMemo } from 'react'
import { useLinkStore } from '../stores/linkStore'
import useTagStore from '../stores/tagStore'
import LinkCard from '../components/LinkCard'
import LinkDetailSheet from '../components/LinkDetailSheet'
import LinkCardSkeleton from '../components/Skeletons/LinkCardSkeleton'
import UpdateIndicator from '../components/UpdateIndicator'
import LinkForm from '../components/LinkForm'
import ExistingTagsMenu from '../components/ExistingTagsMenu'
import SearchBar from '../components/SearchBar'
import KeyboardHelpModal from '../components/KeyboardHelpModal'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { Plus, LayoutGrid, List, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react'

const MyLinksHeader = ({ pagination, viewMode, onToggleFilters, onSetViewMode, onOpenForm, hasActiveFilters }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[var(--border)]">
    <div>
      <span className="mono text-[10px] text-[var(--accent)] font-semibold uppercase tracking-wider block mb-1">
        CATÁLOGO PRINCIPAL
      </span>
      <h1 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[var(--text)]">
        Mis Enlaces
      </h1>
      <p className="mono text-xs text-[var(--muted)] mt-1">
        {pagination?.totalLinks || 0} enlaces registrados · {pagination?.limit || 6} por página
      </p>
    </div>

    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
      {/* Filter Toggle */}
      <button
        type="button"
        onClick={onToggleFilters}
        className={`btn-outline btn-md flex items-center gap-2 ${hasActiveFilters ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`}
      >
        <Filter className="w-3.5 h-3.5" />
        <span>Filtros</span>
        {hasActiveFilters && (
          <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        )}
      </button>

      {/* View Toggle */}
      <div className="flex rounded border border-[var(--border)] bg-[var(--surface-2)] p-0.5" role="group" aria-label="Modo de visualización">
        <button
          type="button"
          onClick={() => onSetViewMode('grid')}
          className={`p-2 rounded text-xs transition-colors cursor-pointer ${
            viewMode === 'grid'
              ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs font-semibold'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
          title="Vista cuadrícula / Masonry"
          aria-pressed={viewMode === 'grid'}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onSetViewMode('list')}
          className={`p-2 rounded text-xs transition-colors cursor-pointer ${
            viewMode === 'list'
              ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs font-semibold'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
          title="Vista lista densa"
          aria-pressed={viewMode === 'list'}
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      {/* New Link CTA */}
      <button
        type="button"
        onClick={onOpenForm}
        className="btn-primary btn-md flex items-center gap-1.5"
      >
        <Plus className="w-4 h-4" />
        <span>Agregar enlace</span>
      </button>
    </div>
  </div>
)

const ActiveFiltersBar = ({ filters, onSearchClear, onRemoveTag, onResetArchived, onResetFavorite, onClearAll }) => (
  <div className="flex flex-wrap items-center gap-2 py-1">
    <span className="mono text-[10px] text-[var(--muted)] uppercase font-semibold mr-1">
      Filtros activos:
    </span>

    {filters.search ? (
      <button
        type="button"
        onClick={onSearchClear}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[10px] bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--danger)] transition-colors"
      >
        <span>Búsqueda: {filters.search}</span>
        <X className="w-3 h-3 text-[var(--muted)]" />
      </button>
    ) : null}

    {(filters.tags || []).map((tag) => (
      <button
        key={tag}
        type="button"
        onClick={() => onRemoveTag(tag)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[10px] bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 hover:border-[var(--danger)] transition-colors"
      >
        <span>#{tag}</span>
        <X className="w-3 h-3" />
      </button>
    ))}

    {filters.archived ? (
      <button
        type="button"
        onClick={onResetArchived}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[10px] bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--danger)] transition-colors"
      >
        <span>Archivados</span>
        <X className="w-3 h-3" />
      </button>
    ) : null}

    {filters.favorite !== null ? (
      <button
        type="button"
        onClick={onResetFavorite}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[10px] bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--danger)] transition-colors"
      >
        <span>{filters.favorite ? 'Solo favoritos' : 'Sin favoritos'}</span>
        <X className="w-3 h-3 text-[var(--muted)]" />
      </button>
    ) : null}

    <button
      type="button"
      onClick={onClearAll}
      className="mono text-[10px] text-[var(--accent)] hover:underline ml-1 cursor-pointer"
    >
      Limpiar filtros
    </button>
  </div>
)

const FiltersPanel = ({ filters, tags, onFilterChange }) => (
  <div className="card p-4 sm:p-5 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div>
        <label htmlFor="filter-status" className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block mb-1.5">
          Estado
        </label>
        <select
          id="filter-status"
          value={filters.archived ? 'archived' : 'active'}
          onChange={(e) => onFilterChange({ archived: e.target.value === 'archived' })}
          className="input text-xs"
        >
          <option value="active">Activos</option>
          <option value="archived">Archivados</option>
        </select>
      </div>

      <div>
        <label htmlFor="filter-favorite" className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block mb-1.5">
          Favoritos
        </label>
        <select
          id="filter-favorite"
          value={filters.favorite === true ? 'favorites' : filters.favorite === false ? 'non-favorites' : 'all'}
          onChange={(e) => {
            const value = e.target.value === 'favorites' ? true : e.target.value === 'non-favorites' ? false : null
            onFilterChange({ favorite: value })
          }}
          className="input text-xs"
        >
          <option value="all">Todos</option>
          <option value="favorites">Solo favoritos</option>
          <option value="non-favorites">Sin favoritos</option>
        </select>
      </div>

      <div>
        <label htmlFor="filter-sort-by" className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block mb-1.5">
          Ordenar por
        </label>
        <select
          id="filter-sort-by"
          value={filters.sortBy}
          onChange={(e) => onFilterChange({ sortBy: e.target.value })}
          className="input text-xs"
        >
          <option value="createdAt">Fecha de creación</option>
          <option value="title">Título</option>
          <option value="clickCount">Más visitados</option>
          <option value="lastVisited">Última visita</option>
        </select>
      </div>

      <div>
        <label htmlFor="filter-sort-order" className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block mb-1.5">
          Orden
        </label>
        <select
          id="filter-sort-order"
          value={filters.sortOrder}
          onChange={(e) => onFilterChange({ sortOrder: e.target.value })}
          className="input text-xs"
        >
          <option value="desc">Descendente</option>
          <option value="asc">Ascendente</option>
        </select>
      </div>

      <div className="md:col-span-1">
        <ExistingTagsMenu
          label="Filtrar por etiquetas"
          availableTags={tags}
          selectedTags={filters.tags || []}
          onChange={(newTags) => onFilterChange({ tags: newTags })}
          helperText="Muestra enlaces que contengan las etiquetas seleccionadas."
        />
      </div>
    </div>
  </div>
)

const EmptyLinksState = ({ hasActiveFilters, onOpenForm }) => (
  <div className="text-center py-16 px-4 border border-dashed border-[var(--border)] rounded-lg bg-[var(--surface-2)]/30">
    <div className="mx-auto h-16 w-16 text-[var(--muted)] mb-3 flex items-center justify-center">
      <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    </div>
    <span className="mono text-[10px] text-[var(--accent)] font-semibold uppercase tracking-wider block mb-1">
      {hasActiveFilters ? 'BÚSQUEDA SIN COINCIDENCIAS' : 'CATÁLOGO VACÍO'}
    </span>
    <h3 className="text-lg font-bold font-sans text-[var(--text)] mb-2">
      {hasActiveFilters ? 'No se encontraron resultados' : 'No tienes enlaces guardados todavía'}
    </h3>
    <p className="text-xs text-[var(--muted)] max-w-sm mx-auto mb-6">
      {hasActiveFilters
        ? 'Prueba modificando los términos de búsqueda o limpiando los filtros seleccionados.'
        : 'Guarda tu primer enlace para indexar y organizar tus recursos favoritos con metadata automática.'}
    </p>
    {!hasActiveFilters && (
      <button type="button" onClick={onOpenForm} className="btn-primary btn-md">
        Guardar primer enlace
      </button>
    )}
  </div>
)

const LinksList = ({ links, viewMode, filters, fetchLinks, onOpenDetail }) => {
  if (viewMode === 'list') {
    return (
      <div className="divide-y divide-[var(--border)] border-t border-b border-[var(--border)]">
        {links?.map((link) => (
          <LinkCard
            key={link._id}
            link={link}
            viewMode="list"
            mode="full"
            onUpdate={() => fetchLinks(filters)}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    )
  }

  // Masonry multi-column layout
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 [column-fill:_balance]">
      {links?.map((link) => (
        <LinkCard
          key={link._id}
          link={link}
          viewMode="grid"
          mode="full"
          onUpdate={() => fetchLinks(filters)}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  )
}

const LinksPagination = ({ pagination, onPageChange }) => {
  if (pagination?.totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6 rounded-lg mt-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(pagination.currentPage - 1)}
          disabled={!pagination?.hasPrevPage}
          className="btn-outline btn-sm"
        >
          Anterior
        </button>
        <button
          onClick={() => onPageChange(pagination.currentPage + 1)}
          disabled={!pagination?.hasNextPage}
          className="btn-outline btn-sm"
        >
          Siguiente
        </button>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between font-mono text-xs text-[var(--muted)]">
        <div>
          Página <span className="text-[var(--text)] font-semibold">{pagination?.currentPage || 1}</span> de{' '}
          <span className="text-[var(--text)] font-semibold">{pagination?.totalPages || 1}</span> ({pagination?.totalLinks || 0} enlaces)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.currentPage - 1)}
            disabled={!pagination?.hasPrevPage}
            className="btn-outline btn-sm flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Anterior
          </button>
          <button
            onClick={() => onPageChange(pagination.currentPage + 1)}
            disabled={!pagination?.hasNextPage}
            className="btn-outline btn-sm flex items-center gap-1"
          >
            Siguiente
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

const LinkFormModal = ({ isOpen, onClose, onSave }) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-form-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="relative z-10 w-full max-w-xl bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg shadow-2xl p-5 sm:p-6 my-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <LinkForm onSave={onSave} onCancel={onClose} />
      </div>
    </div>
  )
}

const MyLinks = () => {
  const [ui, setUi] = useState(() => ({
    showLinkForm: false,
    viewMode: localStorage.getItem('linkstash_view_mode') || 'grid',
    showFilters: false,
    showKeyboardHelp: false
  }))
  const [selectedLinkId, setSelectedLinkId] = useState(null)
  const { showLinkForm, viewMode, showFilters, showKeyboardHelp } = ui
  const searchBarRef = useRef(null)

  // Selectors for Zustand linkStore
  const isLoading = useLinkStore((state) => state.isLoading)
  const pagination = useLinkStore((state) => state.pagination)
  const filters = useLinkStore((state) => state.filters)
  const fetchLinks = useLinkStore((state) => state.fetchLinks)
  const setFilters = useLinkStore((state) => state.setFilters)
  const linksById = useLinkStore((state) => state.linksById)
  const linkIds = useLinkStore((state) => state.linkIds)
  const tags = useTagStore((state) => state.tags)
  const fetchTags = useTagStore((state) => state.fetchTags)

  const links = useMemo(() => {
    return linkIds.flatMap((id) => {
      const link = linksById[id]
      return link ? [link] : []
    })
  }, [linkIds, linksById])

  const [status, setStatus] = useState({ loadError: '', isUpdating: false })
  const { loadError, isUpdating } = status
  const selectedLink = selectedLinkId ? linksById[selectedLinkId] : null

  const handleSetViewMode = (mode) => {
    localStorage.setItem('linkstash_view_mode', mode)
    setUi((prev) => ({ ...prev, viewMode: mode }))
  }

  // Keyboard shortcuts integration
  useKeyboardShortcuts({
    onSearchFocus: () => {
      searchBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    onNewLink: () => setUi((prev) => ({ ...prev, showLinkForm: true })),
    onHelp: () => setUi((prev) => ({ ...prev, showKeyboardHelp: !prev.showKeyboardHelp }))
  })

  // Initial load
  useEffect(() => {
    let mounted = true
    const initialFetch = async () => {
      const res = await fetchLinks()
      if (mounted && res && res.success === false) {
        setStatus((prev) => ({ ...prev, loadError: res.message || 'Error al cargar enlaces' }))
      } else {
        setStatus((prev) => ({ ...prev, loadError: '' }))
      }
    }

    initialFetch()
    return () => { mounted = false }
  }, [fetchLinks])

  // Smart polling for links in 'processing' status
  useEffect(() => {
    const hasProcessing = links.some((l) => l.status === 'processing')
    if (!hasProcessing) return

    const timer = setTimeout(async () => {
      await fetchLinks(filters)
    }, 4000)

    return () => clearTimeout(timer)
  }, [links, filters, fetchLinks])

  useEffect(() => {
    if (!tags || tags.length === 0) {
      fetchTags()
    }
  }, [])

  const handleSearch = async (query, signal = null) => {
    setStatus((prev) => ({ ...prev, isUpdating: true }))
    setFilters({ ...filters, search: query, page: 1 })
    const res = await fetchLinks({ ...filters, search: query, page: 1 }, signal)
    if (res && res.success === false && !res.aborted) {
      setStatus((prev) => ({ ...prev, loadError: res.message || 'Error al cargar enlaces', isUpdating: false }))
      return
    }
    setStatus((prev) => ({ ...prev, isUpdating: false }))
  }

  const handleFilterChange = async (newFilters) => {
    setStatus((prev) => ({ ...prev, isUpdating: true }))
    const updatedFilters = { ...filters, ...newFilters, page: 1 }
    setFilters(updatedFilters)
    const res = await fetchLinks(updatedFilters)
    if (res && res.success === false && !res.aborted) {
      setStatus((prev) => ({ ...prev, loadError: res.message || 'Error al cargar enlaces', isUpdating: false }))
      return
    }
    setStatus((prev) => ({ ...prev, isUpdating: false }))
  }

  const handlePageChange = async (page) => {
    setStatus((prev) => ({ ...prev, isUpdating: true }))
    const res = await fetchLinks({ ...filters, page })
    if (res && res.success === false && !res.aborted) {
      setStatus((prev) => ({ ...prev, loadError: res.message || 'Error al cargar enlaces', isUpdating: false }))
      return
    }
    setStatus((prev) => ({ ...prev, isUpdating: false }))
  }

  const hasActiveFilters = Boolean(filters.search) || (filters.tags?.length || 0) > 0 || filters.archived || filters.favorite !== null

  const handleLinkSaved = async () => {
    setUi((prev) => ({ ...prev, showLinkForm: false }))
    const res = await fetchLinks({ ...filters, page: 1 })
    if (res && res.success === false && !res.aborted) {
      setStatus((prev) => ({ ...prev, loadError: res.message || 'Error al cargar enlaces' }))
    }
  }

  // Initial skeleton loader
  if (isLoading && (!links || links.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <div>
            <div className="h-6 w-36 loading-skeleton" />
            <div className="h-4 w-24 loading-skeleton mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <LinkCardSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <UpdateIndicator isUpdating={isUpdating} />

      <MyLinksHeader
        pagination={pagination}
        viewMode={viewMode}
        onToggleFilters={() => setUi((prev) => ({ ...prev, showFilters: !prev.showFilters }))}
        onSetViewMode={handleSetViewMode}
        onOpenForm={() => setUi((prev) => ({ ...prev, showLinkForm: true }))}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Search Bar */}
      <div ref={searchBarRef}>
        <SearchBar key={filters.search} onSearch={handleSearch} defaultValue={filters.search} />
      </div>

      {/* Active filters pill bar */}
      {hasActiveFilters && (
        <ActiveFiltersBar
          filters={filters}
          onSearchClear={() => handleSearch('')}
          onRemoveTag={(tag) => handleFilterChange({ tags: (filters.tags || []).filter((item) => item !== tag) })}
          onResetArchived={() => handleFilterChange({ archived: false })}
          onResetFavorite={() => handleFilterChange({ favorite: null })}
          onClearAll={async () => {
            const resetFilters = {
              search: '',
              tags: [],
              archived: false,
              favorite: null,
              sortBy: filters.sortBy,
              sortOrder: filters.sortOrder,
              page: 1
            }
            setStatus((prev) => ({ ...prev, isUpdating: true }))
            setFilters(resetFilters)
            const res = await fetchLinks(resetFilters)
            if (res && res.success === false && !res.aborted) {
              setStatus((prev) => ({ ...prev, loadError: res.message || 'Error al cargar enlaces', isUpdating: false }))
              return
            }
            setStatus((prev) => ({ ...prev, isUpdating: false }))
          }}
        />
      )}

      {/* Filter Options Panel */}
      {showFilters && <FiltersPanel filters={filters} tags={tags} onFilterChange={handleFilterChange} />}

      {/* Inline error feedback */}
      {loadError && (
        <div className="p-4 rounded border border-[var(--danger)]/50 bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-between text-xs font-mono">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={async () => {
              const res = await fetchLinks(filters)
              setStatus((prev) => ({
                ...prev,
                loadError: res && res.success === false ? (res.message || 'Error al cargar enlaces') : ''
              }))
            }}
            className="btn-outline btn-sm text-[var(--danger)]"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Links Catalog (Masonry Grid or Dense List) */}
      {!links || links.length === 0 ? (
        <EmptyLinksState hasActiveFilters={hasActiveFilters} onOpenForm={() => setUi((prev) => ({ ...prev, showLinkForm: true }))} />
      ) : (
        <>
          <LinksList
            links={links}
            viewMode={viewMode}
            filters={filters}
            fetchLinks={fetchLinks}
            onOpenDetail={(link) => setSelectedLinkId(link._id)}
          />
          <LinksPagination pagination={pagination} onPageChange={handlePageChange} />
        </>
      )}

      {/* Slide-over Detail Inspector */}
      <LinkDetailSheet
        link={selectedLink}
        allTags={tags}
        isOpen={Boolean(selectedLink)}
        onClose={() => setSelectedLinkId(null)}
        onUpdate={async () => {
          await fetchLinks({ ...filters, page: pagination.currentPage || 1 })
        }}
      />

      {/* Save Link Modal */}
      <LinkFormModal
        isOpen={showLinkForm}
        onClose={() => setUi((prev) => ({ ...prev, showLinkForm: false }))}
        onSave={handleLinkSaved}
      />

      {/* Keyboard Shortcuts Reference Modal */}
      <KeyboardHelpModal
        isOpen={showKeyboardHelp}
        onClose={() => setUi((prev) => ({ ...prev, showKeyboardHelp: false }))}
      />
    </div>
  )
}

export default MyLinks
