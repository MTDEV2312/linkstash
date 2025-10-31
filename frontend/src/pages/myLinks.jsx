import { useState, useEffect } from 'react'
import { useLinkStore } from '../stores/linkStore'
import LinkCard from '../components/LinkCard'
import LinkForm from '../components/LinkForm'
import SearchBar from '../components/SearchBar'
import { Plus, Grid, List, Filter } from 'lucide-react'

const MyLinks = () => {
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' o 'list'
  const [showFilters, setShowFilters] = useState(false)
  
  const { 
    links, 
    isLoading, 
    pagination, 
    filters,
    fetchLinks,
    setFilters
  } = useLinkStore()

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const handleSearch = (query) => {
    setFilters({ ...filters, search: query, page: 1 })
    fetchLinks({ ...filters, search: query, page: 1 })
  }

  const handleFilterChange = (newFilters) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 }
    setFilters(updatedFilters)
    fetchLinks(updatedFilters)
  }

  const handlePageChange = (page) => {
    fetchLinks({ ...filters, page })
  }

  const handleLinkSaved = () => {
    setShowLinkForm(false)
    fetchLinks({ ...filters, page: 1 }) // Refrescar la primera página
  }

  if (isLoading && links.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Enlaces</h1>
          <p className="text-gray-600">
            {pagination.totalLinks} enlaces guardados
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
      <SearchBar onSearch={handleSearch} initialValue={filters.search} />

      {/* Filtros */}
      {showFilters && (
        <div className="card">
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
            </div>
          </div>
        </div>
      )}

      {/* Lista de enlaces */}
      {links.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No tienes enlaces guardados
          </h3>
          <p className="text-gray-600 mb-6">
            Comienza agregando tu primer enlace para organizarlo mejor.
          </p>
          <button
            onClick={() => setShowLinkForm(true)}
            className="btn-primary btn-md"
          >
            Agregar primer enlace
          </button>
        </div>
      ) : (
        <>
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }>
            {links.map((link) => (
              <LinkCard 
                key={link._id} 
                link={link} 
                viewMode={viewMode}
                mode="full"
                onUpdate={() => fetchLinks(filters)}
              />
            ))}
          </div>

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="btn-outline btn-md disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="btn-outline btn-md disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
              
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando página <span className="font-medium">{pagination.currentPage}</span> de{' '}
                    <span className="font-medium">{pagination.totalPages}</span> ({pagination.totalLinks} enlaces)
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                      className="btn-outline btn-sm disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNextPage}
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
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <LinkForm 
                onSave={handleLinkSaved}
                onCancel={() => setShowLinkForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyLinks
