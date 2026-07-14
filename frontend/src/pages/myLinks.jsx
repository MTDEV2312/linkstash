import { useState, useEffect, useRef, useMemo } from 'react'
import { useLinkStore } from '../stores/linkStore'
import useTagStore from '../stores/tagStore'
import LinkCard from '../components/LinkCard'
import OptimizedImage from '../components/OptimizedImage'
import LinkCardSkeleton from '../components/Skeletons/LinkCardSkeleton'
import UpdateIndicator from '../components/UpdateIndicator'
import LinkForm from '../components/LinkForm'
import ExistingTagsMenu from '../components/ExistingTagsMenu'
import SearchBar from '../components/SearchBar'
import KeyboardHelpModal from '../components/KeyboardHelpModal'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { Plus, Grid, List, Filter, X, Pencil, Trash2, ExternalLink, Save, Upload, Image as ImageIcon } from 'lucide-react'

const isValidUrl = (value) => {
  try {
    new URL(value.startsWith('http') ? value : `https://${value}`)
    return true
  } catch {
    return false
  }
}

const normalizeUrl = (url) => {
  if (!url) return ''
  return url.startsWith('http') ? url : `https://${url}`
}

const normalizeTagSelections = (tags = []) => {
  return [...new Set((Array.isArray(tags) ? tags : [])
    .flatMap((tagItem) => {
      const normalized = typeof tagItem === 'object' && tagItem !== null
        ? (tagItem.name || tagItem._id || '').trim()
        : String(tagItem || '').trim()

      return normalized ? [normalized] : []
    }))]
}

const formatDateLong = (value) => {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const LinkDetailSheet = ({
  link,
  allTags,
  isOpen,
  isEditing,
  formState,
  onClose,
  onStartEdit,
  onCancelEdit,
  onDelete,
  onSave,
  onFormChange,
  onTagsChange,
  onImageUrlChange,
  onFileChange,
  onRestoreImage,
  onClearImage
}) => {
  if (!isOpen || !link) return null

  const resolveTagName = (tagItem) => {
    if (typeof tagItem === 'object' && tagItem !== null) {
      return tagItem.name || tagItem._id || 'Tag'
    }

    const fromCatalog = (allTags || []).find((tag) => tag._id === tagItem || tag.name === tagItem)
    return fromCatalog?.name || tagItem
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar detalle del enlace"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-gray-900 shadow-xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Detalle del enlace</h2>
          <button type="button" onClick={onClose} className="btn-outline btn-sm">Cerrar</button>
        </div>

        <div className="p-6 space-y-5">
          {link.image ? (
            <OptimizedImage
              src={link.image}
              alt={link.title || 'Vista previa'}
              width={600}
              height={224}
              className="w-full h-56 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
              isStored={link.imageIsStored}
            />
          ) : (
            <div className="w-full h-56 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              Sin imagen disponible
            </div>
          )}

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="detail-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                <input
                  id="detail-title"
                  value={formState.title}
                  onChange={(event) => onFormChange('title', event.target.value)}
                  className="input"
                  maxLength={200}
                  placeholder="Título del enlace"
                />
              </div>

              <div>
                <label htmlFor="detail-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                <input
                  id="detail-url"
                  value={formState.url}
                  onChange={(event) => onFormChange('url', event.target.value)}
                  className="input"
                  placeholder="https://ejemplo.com"
                />
              </div>

              <div>
                <label htmlFor="detail-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea
                  id="detail-description"
                  value={formState.description}
                  onChange={(event) => onFormChange('description', event.target.value)}
                  className="input min-h-[140px] resize-none"
                  maxLength={500}
                  placeholder="Descripción del enlace"
                />
                <p className="text-xs text-gray-500 mt-1">{formState.description.length}/500</p>
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Imagen del enlace</p>

                {formState.imagePreview ? (
                  <OptimizedImage
                    src={formState.imagePreview}
                    alt="Preview de imagen"
                    width={600}
                    height={192}
                    className="w-full h-48 object-cover rounded-xl border border-gray-200 dark:border-gray-700 mb-3"
                  />
                ) : (
                  <div className="w-full h-48 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Sin imagen seleccionada
                  </div>
                )}

                <div className="space-y-3">
                  <label htmlFor="detail-image-file" className="flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-gray-400 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {formState.imageFileName || 'Subir imagen desde tu computadora'}
                    </span>
                  </label>
                  <input
                    id="detail-image-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileChange}
                  />

                  <div>
                    <label htmlFor="detail-image-url" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">O pegar URL de imagen</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ImageIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        id="detail-image-url"
                        value={formState.imageUrl}
                        onChange={(event) => onImageUrlChange(event.target.value)}
                        className="input pl-10"
                        placeholder="https://ejemplo.com/imagen.jpg"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button type="button" onClick={onRestoreImage} className="btn-outline btn-sm">Restaurar original</button>
                    <button type="button" onClick={onClearImage} className="btn-outline btn-sm text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20">Quitar imagen</button>
                  </div>
                  <p className="text-xs text-gray-500">Si subís desde tu dispositivo, se almacenará en cloud para servirla desde el frontend.</p>
                </div>
              </div>

              <div>
                <ExistingTagsMenu
                  label="Etiquetas"
                  availableTags={allTags}
                  selectedTags={formState.tags || []}
                  onChange={onTagsChange}
                  emptyText="No hay etiquetas creadas todavía"
                  helperText="Solo podés seleccionar etiquetas existentes."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={onCancelEdit} className="btn-outline btn-md">Cancelar</button>
                <button type="button" onClick={onSave} className="btn-primary btn-md flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar cambios
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white break-words">{link.title || 'Sin título'}</h3>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center text-sm text-primary-600 dark:text-primary-400 hover:underline break-all"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  {link.url}
                </a>
              </div>

              <div className="card">
                <div className="card-content space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <p><span className="font-medium">Descripción:</span> {link.description || 'Sin descripción'}</p>
                  <p><span className="font-medium">Creado:</span> {formatDateLong(link.createdAt)}</p>
                  <p><span className="font-medium">Última visita:</span> {formatDateLong(link.lastVisited)}</p>
                  <p><span className="font-medium">Visitas:</span> {link.clickCount || 0}</p>
                </div>
              </div>

              {Array.isArray(link.tags) && link.tags.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Etiquetas</p>
                  <div className="flex flex-wrap gap-2">
                    {link.tags.map((tagItem, index) => (
                      <span key={typeof tagItem === 'object' && tagItem !== null ? (tagItem._id || tagItem.name || index) : (tagItem || index)} className="badge-secondary">
                        {resolveTagName(tagItem)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={onStartEdit} className="btn-primary btn-md flex items-center">
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </button>
                <button type="button" onClick={onDelete} className="btn-outline btn-md text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20 flex items-center">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

const MyLinksHeader = ({ pagination, viewMode, onToggleFilters, onSetViewMode, onOpenForm }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Enlaces</h1>
      <p className="text-gray-600 dark:text-gray-300">{pagination?.totalLinks || 0} enlaces guardados · 6 por página</p>
    </div>

    <div className="flex items-center gap-2">
      <button onClick={onToggleFilters} className="btn-outline btn-md flex items-center">
        <Filter className="w-4 h-4 mr-2" />
        Filtros
      </button>

      <div className="flex rounded-md border border-gray-300">
        <button
          onClick={() => onSetViewMode('grid')}
          className={`p-2 ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSetViewMode('list')}
          className={`p-2 border-l border-gray-300 ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      <button onClick={onOpenForm} className="btn-primary btn-md flex items-center">
        <Plus className="w-4 h-4 mr-2" />
        Agregar enlace
      </button>
    </div>
  </div>
)

const ActiveFiltersBar = ({ filters, onSearchClear, onRemoveTag, onResetArchived, onResetFavorite, onClearAll }) => (
  <div className="flex flex-wrap items-center gap-2">
    {filters.search ? (
      <button
        type="button"
        onClick={onSearchClear}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
      >
        Búsqueda: {filters.search}
        <X className="w-3 h-3" />
      </button>
    ) : null}

    {(filters.tags || []).map((tag) => (
      <button
        key={tag}
        type="button"
        onClick={() => onRemoveTag(tag)}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-200"
      >
        Tag: {tag}
        <X className="w-3 h-3" />
      </button>
    ))}

    {filters.archived ? (
      <button
        type="button"
        onClick={onResetArchived}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
      >
        Archivados
        <X className="w-3 h-3" />
      </button>
    ) : null}

    {filters.favorite !== null ? (
      <button
        type="button"
        onClick={onResetFavorite}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
      >
        {filters.favorite ? 'Solo favoritos' : 'Sin favoritos'}
        <X className="w-3 h-3" />
      </button>
    ) : null}

    <button type="button" onClick={onClearAll} className="text-xs text-primary-700 hover:text-primary-800 dark:text-primary-300">
      Limpiar filtros
    </button>
  </div>
)

const FiltersPanel = ({ filters, tags, onFilterChange }) => (
  <div className="card">
    <div className="card-content">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estado</label>
          <select
            id="filter-status"
            value={filters.archived ? 'archived' : 'active'}
            onChange={(e) => onFilterChange({ archived: e.target.value === 'archived' })}
            className="input"
          >
            <option value="active">Activos</option>
            <option value="archived">Archivados</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-favorite" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Favoritos</label>
          <select
            id="filter-favorite"
            value={filters.favorite === true ? 'favorites' : filters.favorite === false ? 'non-favorites' : 'all'}
            onChange={(e) => {
              const value = e.target.value === 'favorites' ? true : e.target.value === 'non-favorites' ? false : null
              onFilterChange({ favorite: value })
            }}
            className="input"
          >
            <option value="all">Todos</option>
            <option value="favorites">Solo favoritos</option>
            <option value="non-favorites">Sin favoritos</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-sort-by" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ordenar por</label>
          <select id="filter-sort-by" value={filters.sortBy} onChange={(e) => onFilterChange({ sortBy: e.target.value })} className="input">
            <option value="createdAt">Fecha de creación</option>
            <option value="title">Título</option>
            <option value="clickCount">Más visitados</option>
            <option value="lastVisited">Última visita</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-sort-order" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Orden</label>
          <select id="filter-sort-order" value={filters.sortOrder} onChange={(e) => onFilterChange({ sortOrder: e.target.value })} className="input">
            <option value="desc">Descendente</option>
            <option value="asc">Ascendente</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <ExistingTagsMenu
            label="Filtrar por etiquetas"
            availableTags={tags}
            selectedTags={filters.tags || []}
            onChange={(newTags) => onFilterChange({ tags: newTags })}
            helperText="Mostrando enlaces que tengan al menos una de las etiquetas seleccionadas."
          />
        </div>
      </div>
    </div>
  </div>
)

const EmptyLinksState = ({ hasActiveFilters, onOpenForm }) => (
  <div className="text-center py-12">
    <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{hasActiveFilters ? 'Sin resultados' : 'No tienes enlaces guardados'}</h3>
    <p className="text-gray-600 dark:text-gray-300 mb-6">
      {hasActiveFilters ? 'No hay enlaces que coincidan con tus filtros actuales.' : 'Comienza agregando tu primer enlace para organizarlo mejor.'}
    </p>
    {!hasActiveFilters && (
      <button onClick={onOpenForm} className="btn-primary btn-md">
        Agregar primer enlace
      </button>
    )}
  </div>
)

const LinksList = ({ links, viewMode, filters, fetchLinks, onOpenDetail }) => (
  <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
    {links?.map((link) => (
      <LinkCard key={link._id} link={link} viewMode={viewMode} mode="full" onUpdate={() => fetchLinks(filters)} onOpenDetail={onOpenDetail} />
    ))}
  </div>
)

const LinksPagination = ({ pagination, onPageChange }) => {
  if (pagination?.totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button onClick={() => onPageChange(pagination.currentPage - 1)} disabled={!pagination?.hasPrevPage} className="btn-outline btn-md disabled:opacity-50">
          Anterior
        </button>
        <button onClick={() => onPageChange(pagination.currentPage + 1)} disabled={!pagination?.hasNextPage} className="btn-outline btn-md disabled:opacity-50">
          Siguiente
        </button>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Mostrando página <span className="font-medium">{pagination?.currentPage || 1}</span> de <span className="font-medium">{pagination?.totalPages || 1}</span> ({pagination?.totalLinks || 0} enlaces)
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
            <button onClick={() => onPageChange(pagination.currentPage - 1)} disabled={!pagination?.hasPrevPage} className="btn-outline btn-sm disabled:opacity-50">
              Anterior
            </button>
            <button onClick={() => onPageChange(pagination.currentPage + 1)} disabled={!pagination?.hasNextPage} className="btn-outline btn-sm disabled:opacity-50 ml-2">
              Siguiente
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}

const LinkFormModal = ({ isOpen, onClose, onSave }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <button type="button" aria-label="Cerrar modal de nuevo enlace" className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <LinkForm onSave={onSave} onCancel={onClose} />
        </div>
      </div>
    </div>
  )
}

const MyLinks = () => {
  const [ui, setUi] = useState({
    showLinkForm: false,
    viewMode: 'grid',
    showFilters: false,
    showKeyboardHelp: false
  })
  const [detail, setDetail] = useState({
    selectedLinkId: null,
    isEditing: false,
    imageFile: null,
    form: {
      title: '',
      url: '',
      description: '',
      imageUrl: '',
      imagePreview: '',
      imageFileName: ''
    }
  })
  const { showLinkForm, viewMode, showFilters, showKeyboardHelp } = ui
  const { selectedLinkId, isEditing, form } = detail
  const searchBarRef = useRef(null)
  
  // Usar selectores para asegurar re-renders exactos
  const isLoading = useLinkStore(state => state.isLoading)
  const pagination = useLinkStore(state => state.pagination)
  const filters = useLinkStore(state => state.filters)
  const fetchLinks = useLinkStore(state => state.fetchLinks)
  const setFilters = useLinkStore(state => state.setFilters)
  const updateLink = useLinkStore(state => state.updateLink)
  const deleteLink = useLinkStore(state => state.deleteLink)
  const linksById = useLinkStore(state => state.linksById)
  const linkIds = useLinkStore(state => state.linkIds)
  const tags = useTagStore(state => state.tags)
  const fetchTags = useTagStore(state => state.fetchTags)
  
  // Computar links basado en cambios de linksById y linkIds
  const links = useMemo(() => {
    return linkIds.flatMap((id) => {
      const link = linksById[id]
      return link ? [link] : []
    })
  }, [linkIds, linksById])

  const [status, setStatus] = useState({ loadError: '', isUpdating: false })
  const { loadError, isUpdating } = status
  const selectedLink = selectedLinkId ? linksById[selectedLinkId] : null

  useEffect(() => {
    if (selectedLinkId && !selectedLink) {
      setDetail((prev) => ({
        ...prev,
        selectedLinkId: null,
        isEditing: false
      }))
    }
  }, [selectedLinkId, selectedLink])

  // Integrar atajos de teclado globales
  useKeyboardShortcuts({
    onSearchFocus: () => {
      searchBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    onNewLink: () => setUi((prev) => ({ ...prev, showLinkForm: true })),
    onHelp: () => setUi((prev) => ({ ...prev, showKeyboardHelp: !prev.showKeyboardHelp }))
  })

  // Cargar enlaces al montar el componente
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
    // Solo ejecutar una vez al montar el componente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Polling inteligente para refrescar enlaces en estado 'processing' (scraping)
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
  }, [tags, fetchTags])

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
    const res = await fetchLinks({ ...filters, page: 1 }) // Refrescar la primera página
    if (res && res.success === false && !res.aborted) {
      setStatus((prev) => ({ ...prev, loadError: res.message || 'Error al cargar enlaces' }))
    }
  }

  const openLinkDetail = (link) => {
    setDetail({
      selectedLinkId: link._id,
      isEditing: false,
      imageFile: null,
      form: {
        title: link.title || '',
        url: link.url || '',
        description: link.description || '',
        tags: normalizeTagSelections(link.tags),
        imageUrl: link.image || '',
        imagePreview: link.image || '',
        imageFileName: ''
      }
    })
  }

  const closeLinkDetail = () => {
    setDetail((prev) => ({
      ...prev,
      selectedLinkId: null,
      isEditing: false,
      imageFile: null
    }))
  }

  const startDetailEdit = () => {
    if (!selectedLink) return
    setDetail((prev) => ({
      ...prev,
      isEditing: true,
      imageFile: null,
      form: {
        title: selectedLink.title || '',
        url: selectedLink.url || '',
        description: selectedLink.description || '',
        tags: normalizeTagSelections(selectedLink.tags),
        imageUrl: selectedLink.image || '',
        imagePreview: selectedLink.image || '',
        imageFileName: ''
      }
    }))
  }

  const cancelDetailEdit = () => {
    if (!selectedLink) {
      setDetail((prev) => ({ ...prev, isEditing: false }))
      return
    }

    setDetail((prev) => ({
      ...prev,
      isEditing: false,
      imageFile: null,
      form: {
        title: selectedLink.title || '',
        url: selectedLink.url || '',
        description: selectedLink.description || '',
        tags: normalizeTagSelections(selectedLink.tags),
        imageUrl: selectedLink.image || '',
        imagePreview: selectedLink.image || '',
        imageFileName: ''
      }
    }))
  }

  const handleDetailImageFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setStatus((prev) => ({ ...prev, loadError: 'El archivo seleccionado no es una imagen válida.' }))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatus((prev) => ({ ...prev, loadError: 'La imagen no puede superar los 5MB.' }))
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      setDetail((prev) => ({
        ...prev,
        imageFile: file,
        form: {
          ...prev.form,
          imageUrl: '',
          imagePreview: loadEvent.target?.result || '',
          imageFileName: file.name
        }
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleRestoreDetailImage = () => {
    setDetail((prev) => ({
      ...prev,
      imageFile: null,
      form: {
        ...prev.form,
        imageUrl: selectedLink?.image || '',
        imagePreview: selectedLink?.image || '',
        imageFileName: ''
      }
    }))
  }

  const handleClearDetailImage = () => {
    setDetail((prev) => ({
      ...prev,
      imageFile: null,
      form: {
        ...prev.form,
        imageUrl: '',
        imagePreview: '',
        imageFileName: ''
      }
    }))
  }

  const handleDetailFormChange = (field, value) => {
    setDetail((prev) => ({
      ...prev,
      form: {
        ...prev.form,
        [field]: value
      }
    }))
  }

  const handleDetailImageUrlChange = (value) => {
    setDetail((prev) => ({
      ...prev,
      imageFile: null,
      form: {
        ...prev.form,
        imageUrl: value,
        imagePreview: value,
        imageFileName: ''
      }
    }))
  }

  const saveDetailEdit = async () => {
    if (!selectedLink) return

    const normalizedUrl = normalizeUrl(form.url.trim())
    if (!isValidUrl(normalizedUrl)) {
      setStatus((prev) => ({ ...prev, loadError: 'Ingresá una URL válida para guardar cambios.' }))
      return
    }

    const payload = {
      title: form.title.trim(),
      url: normalizedUrl,
      description: form.description.trim(),
      tags: form.tags || selectedLink.tags || [],
      image: form.imageUrl?.trim() || ''
    }

    setStatus((prev) => ({ ...prev, isUpdating: true }))
    const result = detail.imageFile
      ? await updateLink(selectedLink._id, payload, detail.imageFile, true)
      : await updateLink(selectedLink._id, payload, null, Boolean(payload.image))

    if (!result?.success) {
      setStatus((prev) => ({ ...prev, isUpdating: false, loadError: result?.message || 'No se pudo actualizar el enlace.' }))
      return
    }

    await fetchLinks({ ...filters, page: pagination.currentPage || 1 })
    setStatus((prev) => ({ ...prev, isUpdating: false, loadError: '' }))
    setDetail((prev) => ({
      ...prev,
      isEditing: false,
      imageFile: null,
      form: {
        ...prev.form,
        imageFileName: ''
      }
    }))
  }

  const handleDeleteFromDetail = async () => {
    if (!selectedLink) return
    if (!window.confirm('¿Eliminar este enlace? Esta acción no se puede deshacer.')) return

    setStatus((prev) => ({ ...prev, isUpdating: true }))
    const result = await deleteLink(selectedLink._id)
    if (!result?.success) {
      setStatus((prev) => ({ ...prev, isUpdating: false, loadError: result?.message || 'No se pudo eliminar el enlace.' }))
      return
    }

    await fetchLinks({ ...filters, page: pagination.currentPage || 1 })
    setStatus((prev) => ({ ...prev, isUpdating: false, loadError: '' }))
    closeLinkDetail()
  }

  // Carga inicial: mostrar skeletons en lugar de spinner
  if (isLoading && (!links || links.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-24 mt-2 animate-pulse" />
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
        onSetViewMode={(nextMode) => setUi((prev) => ({ ...prev, viewMode: nextMode }))}
        onOpenForm={() => setUi((prev) => ({ ...prev, showLinkForm: true }))}
      />

      {/* Barra de búsqueda */}
      <div ref={searchBarRef}>
        <SearchBar key={filters.search} onSearch={handleSearch} defaultValue={filters.search} />
      </div>

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

      {/* Filtros */}
      {showFilters && <FiltersPanel filters={filters} tags={tags} onFilterChange={handleFilterChange} />}

      {/* Estado de error inline */}
      {loadError && (
        <div className="card border-red-300 dark:border-red-800">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <p className="text-red-700 dark:text-red-300">{loadError}</p>
              <button
                onClick={async () => {
                  const res = await fetchLinks(filters)
                  setStatus((prev) => ({
                    ...prev,
                    loadError: res && res.success === false ? (res.message || 'Error al cargar enlaces') : ''
                  }))
                }}
                className="btn-outline btn-sm"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

       {/* Lista de enlaces */}
       {!links || links.length === 0 ? (
         <EmptyLinksState hasActiveFilters={hasActiveFilters} onOpenForm={() => setUi((prev) => ({ ...prev, showLinkForm: true }))} />
       ) : (
         <>
           <LinksList links={links} viewMode={viewMode} filters={filters} fetchLinks={fetchLinks} onOpenDetail={openLinkDetail} />
           <LinksPagination pagination={pagination} onPageChange={handlePageChange} />
         </>
       )}

      <LinkDetailSheet
        link={selectedLink}
        allTags={tags}
        isOpen={Boolean(selectedLink)}
        isEditing={isEditing}
        formState={form}
        onClose={closeLinkDetail}
        onStartEdit={startDetailEdit}
        onCancelEdit={cancelDetailEdit}
        onDelete={handleDeleteFromDetail}
        onSave={saveDetailEdit}
        onFormChange={handleDetailFormChange}
        onTagsChange={(nextTags) => handleDetailFormChange('tags', nextTags)}
        onImageUrlChange={handleDetailImageUrlChange}
        onFileChange={handleDetailImageFileChange}
        onRestoreImage={handleRestoreDetailImage}
        onClearImage={handleClearDetailImage}
      />

      <LinkFormModal
        isOpen={showLinkForm}
        onClose={() => setUi((prev) => ({ ...prev, showLinkForm: false }))}
        onSave={handleLinkSaved}
      />

      {/* Keyboard Help Modal */}
      <KeyboardHelpModal
        isOpen={showKeyboardHelp}
        onClose={() => setUi((prev) => ({ ...prev, showKeyboardHelp: false }))}
      />
    </div>
  )
}

export default MyLinks
