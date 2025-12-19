import { useState, useEffect } from 'react'
import { useLinkStore } from '../stores/linkStore'
import useTagStore from '../stores/tagStore'
import DescriptionModal from './DescriptionModal'
import EditLinkModal from './EditLinkModal'
import { 
  ExternalLink, 
  Heart, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  Archive,
  Clock,
  AlertCircle,
  Cloud,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const LinkCard = ({ link, viewMode = 'grid', onUpdate, mode = 'full' }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const { toggleFavorite, deleteLink, incrementClickCount, toggleArchive } = useLinkStore()
  
  // Verificar si necesita descripción
  const needsDescription = link.needsDescription && (!link.description || link.description.trim() === '')

  const handleVisit = async () => {
    await incrementClickCount(link._id)
    window.open(link.url, '_blank', 'noopener,noreferrer')
  }

  const handleToggleFavorite = async () => {
    await toggleFavorite(link._id)
    onUpdate?.()
  }

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este enlace?')) {
      await deleteLink(link._id)
      onUpdate?.()
    }
  }

  const handleEditToggle = () => {
    setShowEditModal(true)
    setIsMenuOpen(false)
  }

  const formatDateTime = (date) => {
    if (!date) return null
    return format(new Date(date), 'dd MMM yyyy - HH:mm', { locale: es })
  }

  const handleToggleArchive = async () => {
    await toggleArchive(link._id)
    setIsMenuOpen(false)
    onUpdate?.()
  }

  const formatDate = (date) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: es })
  }

  const getDomainFromUrl = (url) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  // Obtener tags del store (para resolver IDs)
  const { tags: allTags, fetchTags: fetchAllTags } = useTagStore()

  useEffect(() => {
    if (!allTags || allTags.length === 0) {
      fetchAllTags().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resolveTag = (tagItem) => {
    // Si ya es objeto, retornarlo
    if (typeof tagItem === 'object' && tagItem !== null) return tagItem

    // Si es string, puede ser nombre o id
    if (typeof tagItem === 'string') {
      const byId = allTags.find(t => t._id === tagItem)
      if (byId) return byId

      const byName = allTags.find(t => t.name === tagItem)
      if (byName) return byName

      // fallback: retornar el string
      return tagItem
    }

    return tagItem
  }

  // Helpers para mostrar badges coloreadas correctamente
  const hexToRgb = (hex) => {
    if (!hex) return null
    const cleaned = hex.replace('#', '')
    const bigint = parseInt(cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned, 16)
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }
  }

  const getContrastTextColor = (hex) => {
    const rgb = hexToRgb(hex)
    if (!rgb) return '#000'
    // sRGB luminance
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
      const srgb = v / 255
      return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
    })
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return lum > 0.179 ? '#000' : '#fff'
  }

  // Modo "minimal": solo botones esenciales (visitar, favorito) y conteo de clicks
  if (mode === 'minimal') {
    return (
      <div className={`card p-3 flex items-center justify-between ${viewMode === 'list' ? '' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-primary-600 truncate max-w-xs">{getDomainFromUrl(link.url)}</div>
          {link.clickCount > 0 && (
            <div className="text-xs text-gray-500 flex items-center">
              <Eye className="w-4 h-4 mr-1" />{link.clickCount}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => { await incrementClickCount(link._id); window.open(link.url, '_blank', 'noopener,noreferrer') }}
            className="p-2 text-gray-400 hover:text-primary-600 rounded-full transition-colors"
            title="Visitar enlace"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          <button
            onClick={async () => { await toggleFavorite(link._id); onUpdate?.() }}
            className={`p-2 rounded-full transition-colors ${link.isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
            title="Favorito"
          >
            <Heart className={`w-4 h-4 ${link.isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    )
  }



  if (viewMode === 'list') {
    return (
      <div className={`card hover:shadow-md transition-shadow duration-200 ${
        link.status === 'failed' ? 'border-red-300 dark:border-red-800' : ''
      }`}>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                {link.image && (
                  <img
                    src={link.image}
                    alt=""
                    className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {link.title}
                    </h3>
                    {link.status === 'processing' && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                        Procesando...
                      </span>
                    )}
                    {link.status === 'failed' && (
                      <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                        Error
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {link.description || 'Sin descripción'}
                  </p>
                  {link.status === 'failed' && link.scrapingError && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {link.scrapingError}
                    </p>
                  )}
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(link.createdAt)}
                    </span>
                    {link.clickCount > 0 && (
                      <span className="flex items-center">
                        <Eye className="w-3 h-3 mr-1" />
                        {link.clickCount} visitas
                      </span>
                    )}
                    {link.lastVisited && (
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Última: {formatDateTime(link.lastVisited)}
                      </span>
                    )}
                    <span className="text-primary-600 dark:text-primary-400 flex items-center">
                      {link.imageIsCloudinary && (
                        <Cloud className="w-3 h-3 mr-1" title="Imagen en Cloudinary" />
                      )}
                      {getDomainFromUrl(link.url)}
                    </span>
                  </div>
                  
                  {/* Indicador de descripción requerida */}
                  {needsDescription && (
                    <button
                      onClick={() => setShowDescriptionModal(true)}
                      className="flex items-center mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded hover:bg-amber-100 transition-colors"
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Agregar descripción
                    </button>
                  )}
                </div>
              </div>
              
              {link.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {link.tags?.slice(0, 3).map((tagItem) => {
                    const resolved = resolveTag(tagItem)
                    const isObj = typeof resolved === 'object' && resolved !== null
                    const name = isObj ? resolved.name : resolved
                    const idKey = isObj ? resolved._id : name
                    const color = isObj ? resolved.color : null
                    const textColor = color ? getContrastTextColor(color) : undefined
                    return (
                      <span
                        key={idKey}
                        className="text-xs inline-flex items-center px-2 py-0.5 rounded"
                        style={color ? { backgroundColor: color, color: textColor } : undefined}
                      >
                        {name}
                      </span>
                    )
                  })}
                  {link.tags.length > 3 && (
                    <span className="badge-secondary text-xs">
                      +{link.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={handleToggleFavorite}
                className={`p-2 rounded-full transition-colors ${
                  link.isFavorite
                    ? 'text-red-500 hover:text-red-600'
                    : 'text-gray-400 hover:text-red-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${link.isFavorite ? 'fill-current' : ''}`} />
              </button>
              
              <button
                onClick={handleVisit}
                className="p-2 text-gray-400 hover:text-primary-600 rounded-full transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <div className="py-1">
                      <button
                        onClick={handleEditToggle}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit className="w-4 h-4 mr-3" />
                        Editar
                      </button>

                      <button
                        onClick={handleToggleArchive}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Archive className="w-4 h-4 mr-3" />
                        {link.isArchived ? 'Desarchivar' : 'Archivar'}
                      </button>

                      <button
                        onClick={handleDelete}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-3" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Vista de tarjeta (grid)
  return (
    <div className={`card hover:shadow-lg transition-all duration-200 group ${
      link.status === 'processing' ? 'opacity-75' : link.status === 'failed' ? 'border-red-300 dark:border-red-800' : ''
    }`}>
      {/* Indicador de estado de scraping */}
      {link.status === 'processing' && (
        <div className="absolute top-2 right-2 z-10 flex items-center space-x-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>Procesando...</span>
        </div>
      )}
      
      {link.status === 'failed' && (
        <div className="absolute top-2 right-2 z-10 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded-full text-xs font-medium">
          Error al cargar
        </div>
      )}

      {link.image && (
        <div className="aspect-video overflow-hidden rounded-t-lg">
          <img
            src={link.image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              e.target.parentElement.style.display = 'none'
            }}
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1">
            {link.title}
          </h3>
          <button
            onClick={handleToggleFavorite}
            className={`p-1 rounded-full transition-colors ml-2 ${
              link.isFavorite
                ? 'text-red-500 hover:text-red-600'
                : 'text-gray-400 hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${link.isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
        
        {/* Mensaje de error si el scraping falló */}
        {link.status === 'failed' && link.scrapingError && (
          <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
            <p className="text-red-700 dark:text-red-300 font-medium mb-1">
              {link.scrapingErrorType === 'RATE_LIMIT_ERROR' && '⏱️ Límite de solicitudes'}
              {link.scrapingErrorType === 'BLOCKED_ERROR' && '🚫 Sitio bloqueado'}
              {link.scrapingErrorType === 'CONNECTION_ERROR' && '🔌 Error de conexión'}
              {!link.scrapingErrorType && '❌ Error'}
            </p>
            <p className="text-red-600 dark:text-red-400">{link.scrapingError}</p>
            {link.scrapingAttempts > 0 && (
              <p className="text-red-500 dark:text-red-400 mt-1 text-xs">
                Intentos: {link.scrapingAttempts}
              </p>
            )}
          </div>
        )}
        
        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-3">
          {link.description || 'Sin descripción'}
        </p>
        
        {link.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {link.tags?.slice(0, 2).map((tagItem) => {
              const resolved = resolveTag(tagItem)
              const isObj = typeof resolved === 'object' && resolved !== null
              const name = isObj ? resolved.name : resolved
              const idKey = isObj ? resolved._id : name
              const color = isObj ? resolved.color : null
              const textColor = color ? getContrastTextColor(color) : undefined
              return (
                <span
                  key={idKey}
                  className="text-xs inline-flex items-center px-2 py-0.5 rounded"
                  style={color ? { backgroundColor: color, color: textColor } : undefined}
                >
                  {name}
                </span>
              )
            })}
            {link.tags.length > 2 && (
              <span className="badge-secondary text-xs">
                +{link.tags.length - 2}
              </span>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <div className="flex items-center space-x-3">
            <span className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDate(link.createdAt)}
            </span>
            {link.lastVisited && (
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatDateTime(link.lastVisited)}
              </span>
            )}
          </div>
          {link.clickCount > 0 && (
            <span className="flex items-center">
              <Eye className="w-3 h-3 mr-1" />
              {link.clickCount}
            </span>
          )}
        </div>
        
        {/* Indicador de descripción requerida */}
        {needsDescription && (
          <button
            onClick={() => setShowDescriptionModal(true)}
            className="flex items-center mb-3 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded hover:bg-amber-100 transition-colors"
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Agregar descripción
          </button>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-primary-600 font-medium truncate flex items-center">
            {link.imageIsCloudinary && (
              <Cloud className="w-3 h-3 mr-1" title="Imagen en Cloudinary" />
            )}
            {getDomainFromUrl(link.url)}
          </span>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={handleVisit}
              className="btn-primary btn-sm flex items-center"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Visitar
            </button>
            
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                  <div className="py-1">
                    <button
                      onClick={handleEditToggle}
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Edit className="w-3 h-3 mr-2" />
                      Editar
                    </button>

                    <button
                      onClick={handleToggleArchive}
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Archive className="w-3 h-3 mr-2" />
                      {link.isArchived ? 'Desarchivar' : 'Archivar'}
                    </button>

                    <button
                      onClick={handleDelete}
                      className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para agregar descripción */}
      <DescriptionModal
        link={link}
        isOpen={showDescriptionModal}
        onClose={() => setShowDescriptionModal(false)}
        onUpdate={onUpdate}
      />

      {/* Modal para editar enlace */}
      <EditLinkModal
        link={link}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={onUpdate}
      />
    </div>
  )
}

export default LinkCard
