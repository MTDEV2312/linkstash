import { useState, useEffect, useRef, useMemo } from 'react'
import { useLinkStore } from '../stores/linkStore'
import useTagStore from '../stores/tagStore'
import LinkCard from '../components/LinkCard'
import LinkCardSkeleton from '../components/Skeletons/LinkCardSkeleton'
import UpdateIndicator from '../components/UpdateIndicator'
import LinkForm from '../components/LinkForm'
import ExistingTagsMenu from '../components/ExistingTagsMenu'
import SearchBar from '../components/SearchBar'
import KeyboardHelpModal from '../components/KeyboardHelpModal'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { Plus, Grid, List, Filter } from 'lucide-react'

const MyLinks = () => {
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' o 'list'
  const [showFilters, setShowFilters] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const searchBarRef = useRef(null)
  
  // Usar selectores para asegurar re-renders exactos
  const isLoading = useLinkStore(state => state.isLoading)
  const pagination = useLinkStore(state => state.pagination)
  const filters = useLinkStore(state => state.filters)
  const fetchLinks = useLinkStore(state => state.fetchLinks)
  const setFilters = useLinkStore(state => state.setFilters)
  const prefetchNextPage = useLinkStore(state => state.prefetchNextPage)
  const getLinks = useLinkStore(state => state.getLinks)
  const linksById = useLinkStore(state => state.linksById)
  const linkIds = useLinkStore(state => state.linkIds)
  const tags = useTagStore(state => state.tags)
  const fetchTags = useTagStore(state => state.fetchTags)
  
  // Computar links basado en cambios de linksById y linkIds
  const links = useMemo(() => {
    return linkIds.map(id => linksById[id]).filter(Boolean)
  }, [linkIds, linksById])

  const [loadError, setLoadError] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const lastLinkRef = useRef(null)

  // Integrar infinity scroll para prefetch
  const sentinelRef = useInfiniteScroll(
    () => {
      // Solo prefetchear si hay siguiente página y no estamos cargando
      if (pagination?.hasNextPage && !isLoading && !isUpdating) {
        prefetchNextPage()
      }
    },
    { threshold: 0.5, rootMargin: '200px' }
  )

  // Integrar atajos de teclado globales
  useKeyboardShortcuts({
    onSearchFocus: () => {
      searchBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    onNewLink: () => setShowLinkForm(true),
    onHelp: () => setShowKeyboardHelp(!showKeyboardHelp)
  })

  // Cargar enlaces al montar el componente
  useEffect(() => {
    let mounted = true
    const initialFetch = async () => {
      const res = await fetchLinks()
      if (mounted && res && res.success === false) {
        setLoadError(res.message || 'Error al cargar enlaces')
      } else {
        setLoadError('')
      }
    }

    initialFetch()
    return () => { mounted = false }
    // Solo ejecutar una vez al montar el componente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!tags || tags.length === 0) {
      fetchTags()
    }
  }, [tags, fetchTags])

  const handleSearch = async (query, signal = null) => {
    setIsUpdating(true)
    setFilters({ ...filters, search: query, page: 1 })
    const res = await fetchLinks({ ...filters, search: query, page: 1 }, signal)
    if (res && res.success === false && !res.aborted) setLoadError(res.message || 'Error al cargar enlaces')
    setIsUpdating(false)
  }

  const handleFilterChange = async (newFilters) => {
    setIsUpdating(true)
    const updatedFilters = { ...filters, ...newFilters, page: 1 }
    setFilters(updatedFilters)
    const res = await fetchLinks(updatedFilters)
    if (res && res.success === false && !res.aborted) setLoadError(res.message || 'Error al cargar enlaces')
    setIsUpdating(false)
  }

  const handlePageChange = async (page) => {
    setIsUpdating(true)
    const res = await fetchLinks({ ...filters, page })
    if (res && res.success === false && !res.aborted) setLoadError(res.message || 'Error al cargar enlaces')
    setIsUpdating(false)
  }

  const handleLinkSaved = async () => {
    setShowLinkForm(false)
    const res = await fetchLinks({ ...filters, page: 1 }) // Refrescar la primera página
    if (res && res.success === false && !res.aborted) setLoadError(res.message || 'Error al cargar enlaces')
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
      {/* Indicador de actualización */}
      <UpdateIndicator isUpdating={isUpdating} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Enlaces</h1>
          <p className="text-gray-600 dark:text-gray-300">
            {pagination?.totalLinks || 0} enlaces guardados
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline btn-md flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </button>
          
          <div className="flex rounded-md border border-gray-300">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 border-l border-gray-300 ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => setShowLinkForm(true)}
            className="btn-primary btn-md flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar enlace
          </button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div ref={searchBarRef}>
        <SearchBar onSearch={handleSearch} initialValue={filters.search} />
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="card">
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estado
                </label>
                <select
                  value={filters.archived ? 'archived' : 'active'}
                  onChange={(e) => handleFilterChange({ archived: e.target.value === 'archived' })}
                  className="input"
                >
                  <option value="active">Activos</option>
                  <option value="archived">Archivados</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Favoritos
                </label>
                <select
                  value={filters.favorite === true ? 'favorites' : filters.favorite === false ? 'non-favorites' : 'all'}
                  onChange={(e) => {
                    const value = e.target.value === 'favorites' ? true : e.target.value === 'non-favorites' ? false : null
                    handleFilterChange({ favorite: value })
                  }}
                  className="input"
                >
                  <option value="all">Todos</option>
                  <option value="favorites">Solo favoritos</option>
                  <option value="non-favorites">Sin favoritos</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ordenar por
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
                  className="input"
                >
                  <option value="createdAt">Fecha de creación</option>
                  <option value="title">Título</option>
                  <option value="clickCount">Más visitados</option>
                  <option value="lastVisited">Última visita</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Orden
                </label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => handleFilterChange({ sortOrder: e.target.value })}
                  className="input"
                >
                  <option value="desc">Descendente</option>
                  <option value="asc">Ascendente</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <ExistingTagsMenu
                  label="Filtrar por etiquetas"
                  availableTags={tags}
                  selectedTags={filters.tags || []}
                  onChange={(newTags) => handleFilterChange({ tags: newTags })}
                  helperText="Mostrando enlaces que tengan al menos una de las etiquetas seleccionadas."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estado de error inline */}
      {loadError && (
        <div className="card border-red-300 dark:border-red-800">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <p className="text-red-700 dark:text-red-300">{loadError}</p>
              <button
                onClick={async () => {
                  const res = await fetchLinks(filters)
                  setLoadError(res && res.success === false ? (res.message || 'Error al cargar enlaces') : '')
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
         <div className="text-center py-12">
           <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
             <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
             </svg>
           </div>
           <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
             {filters.search ? 'Sin resultados' : 'No tienes enlaces guardados'}
           </h3>
           <p className="text-gray-600 dark:text-gray-300 mb-6">
             {filters.search ? 'No hay enlaces que coincidan con tu búsqueda.' : 'Comienza agregando tu primer enlace para organizarlo mejor.'}
           </p>
           {!filters.search && (
             <button
               onClick={() => setShowLinkForm(true)}
               className="btn-primary btn-md"
             >
               Agregar primer enlace
             </button>
           )}
         </div>
       ) : (
         <>
           <div className={
             viewMode === 'grid' 
               ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
               : 'space-y-4'
           }>
             {links?.map((link) => (
               <LinkCard 
                 key={link._id} 
                 link={link} 
                 viewMode={viewMode}
                 mode="full"
                 onUpdate={() => fetchLinks(filters)}
               />
             ))}
           </div>

           {/* Infinity scroll sentinel - Detecta cuando usuario está cerca del final */}
           <div 
             ref={sentinelRef}
             className="py-4 text-center text-gray-500"
             aria-live="polite"
           >
             {pagination?.hasNextPage && (
               <span className="text-xs">Cargando más...</span>
             )}
           </div>
 
           {/* Paginación */}
           {pagination?.totalPages > 1 && (
             <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6">
               <div className="flex flex-1 justify-between sm:hidden">
                 <button
                   onClick={() => handlePageChange(pagination.currentPage - 1)}
                   disabled={!pagination?.hasPrevPage}
                   className="btn-outline btn-md disabled:opacity-50"
                 >
                   Anterior
                 </button>
                 <button
                   onClick={() => handlePageChange(pagination.currentPage + 1)}
                   disabled={!pagination?.hasNextPage}
                   className="btn-outline btn-md disabled:opacity-50"
                 >
                   Siguiente
                 </button>
               </div>
               
               <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                 <div>
                   <p className="text-sm text-gray-700 dark:text-gray-300">
                     Mostrando página <span className="font-medium">{pagination?.currentPage || 1}</span> de{' '}
                     <span className="font-medium">{pagination?.totalPages || 1}</span> ({pagination?.totalLinks || 0} enlaces)
                   </p>
                 </div>
                 <div>
                   <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                     <button
                       onClick={() => handlePageChange(pagination.currentPage - 1)}
                       disabled={!pagination?.hasPrevPage}
                       className="btn-outline btn-sm disabled:opacity-50"
                     >
                       Anterior
                     </button>
                     <button
                       onClick={() => handlePageChange(pagination.currentPage + 1)}
                       disabled={!pagination?.hasNextPage}
                       className="btn-outline btn-sm disabled:opacity-50 ml-2"
                     >
                       Siguiente
                     </button>
                   </nav>
                 </div>
               </div>
             </div>
           )}
         </>
       )}


      {/* Modal de formulario */}
      {showLinkForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowLinkForm(false)} />
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <LinkForm 
                onSave={handleLinkSaved}
                onCancel={() => setShowLinkForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Help Modal */}
      <KeyboardHelpModal isOpen={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
    </div>
  )
}

export default MyLinks
