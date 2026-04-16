import React, { useState, useEffect, lazy, Suspense } from 'react'
import { useLinkStore } from '../stores/linkStore'
import useTagStore from '../stores/tagStore'
import OptimizedImage from './OptimizedImage'
import { useSwipe } from '../hooks/useSwipe'
import {
  ExternalLink,
  Heart,
  Eye,
  Calendar,
  Archive,
  Clock,
  AlertCircle,
  Cloud,
  AlertTriangle,
  Loader
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const DescriptionModal = lazy(() => import('./DescriptionModal'))

const ModalFallback = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-2">
        <Loader className="w-5 h-5 animate-spin text-primary-500" />
        <span className="text-gray-700 dark:text-gray-300">Cargando...</span>
      </div>
    </div>
  </div>
)

const formatDate = (date) => format(new Date(date), 'dd MMM yyyy', { locale: es })
const formatDateTime = (date) => (date ? format(new Date(date), 'dd MMM yyyy - HH:mm', { locale: es }) : null)

const getDomainFromUrl = (url) => {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const hexToRgb = (hex) => {
  if (!hex) return null
  const cleaned = hex.replace('#', '')
  const bigint = parseInt(cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned, 16)
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }
}

const getContrastTextColor = (hex) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#000'

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const srgb = v / 255
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
  })

  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.179 ? '#000' : '#fff'
}

const CardMenu = ({ link, isOpen, onToggle, onArchive, compact = false }) => (
  <div className="relative">
    <button
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      className="flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
      aria-label="Abrir menú"
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
      </svg>
    </button>

    {isOpen && (
      <div className={`absolute right-0 mt-2 ${compact ? 'w-36' : 'w-48'} bg-white dark:bg-gray-700 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-600`}>
        <div className="py-1">
          <button
            onClick={(event) => {
              event.stopPropagation()
              onArchive()
            }}
            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            <Archive className="w-3 h-3 mr-2" />
            {link.isArchived ? 'Desarchivar' : 'Archivar'}
          </button>
        </div>
      </div>
    )}
  </div>
)

const TagsBadges = ({ tags, limit, resolveTag }) => {
  if (!tags?.length) return null

  return (
    <>
      {tags.slice(0, limit).map((tagItem) => {
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
      {tags.length > limit && <span className="badge-secondary text-xs">+{tags.length - limit}</span>}
    </>
  )
}

const MinimalView = ({ link, handleVisit, handleToggleFavorite }) => (
  <article className="card p-3 flex items-center justify-between" role="article" aria-labelledby={`link-${link._id}-title`}>
    <div className="flex items-center gap-3">
      <div id={`link-${link._id}-title`} className="text-sm font-medium text-primary-600 truncate max-w-xs">{getDomainFromUrl(link.url)}</div>
      {link.clickCount > 0 && (
        <div className="text-xs text-gray-500 flex items-center">
          <Eye className="w-4 h-4 mr-1" />
          {link.clickCount}
        </div>
      )}
    </div>

    <div className="flex items-center gap-2">
      <button onClick={handleVisit} className="flex items-center justify-center w-10 h-10 text-gray-400 hover:text-primary-600 rounded-full transition-colors" title="Visitar enlace" aria-label={`Visitar enlace: ${link.title}`}>
        <ExternalLink className="w-5 h-5" />
      </button>
      <button
        onClick={handleToggleFavorite}
        className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${link.isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
        title={link.isFavorite ? 'Remover de favoritos' : 'Agregar a favoritos'}
        aria-label={link.isFavorite ? `Remover ${link.title} de favoritos` : `Agregar ${link.title} a favoritos`}
        aria-pressed={link.isFavorite}
      >
        <Heart className={`w-5 h-5 ${link.isFavorite ? 'fill-current' : ''}`} />
      </button>
    </div>
  </article>
)

const ListView = ({ link, isMenuOpen, setIsMenuOpen, handleVisit, handleToggleFavorite, handleToggleArchive, hasScrapingError, needsDescription, setShowDescriptionModal, resolveTag, onOpenDetail }) => (
  <article
    className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
    role="button"
    tabIndex={0}
    aria-labelledby={`link-${link._id}-title`}
    onClick={() => onOpenDetail?.(link)}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onOpenDetail?.(link)
      }
    }}
  >
    <div className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            {link.image && (
              <OptimizedImage
                src={link.image}
                alt={link.title}
                width={100}
                height={100}
                className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                quality={70}
                isStored={link.imageIsStored}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 id={`link-${link._id}-title`} className="text-lg font-semibold text-gray-900 dark:text-white truncate">{link.title}</h3>
                {link.status === 'processing' && <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full whitespace-nowrap">Procesando...</span>}
                {hasScrapingError && (
                  <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full whitespace-nowrap flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Error info
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{link.description || 'Sin descripción'}</p>
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{formatDate(link.createdAt)}</span>
                {link.clickCount > 0 && <span className="flex items-center"><Eye className="w-3 h-3 mr-1" />{link.clickCount} visitas</span>}
                {link.lastVisited && <span className="flex items-center"><Clock className="w-3 h-3 mr-1" />Última: {formatDateTime(link.lastVisited)}</span>}
                <span className="text-primary-600 dark:text-primary-400 flex items-center">{link.imageIsStored && <Cloud className="w-3 h-3 mr-1" />}{getDomainFromUrl(link.url)}</span>
              </div>

              {needsDescription && (
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    setShowDescriptionModal(true)
                  }}
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
              <TagsBadges tags={link.tags} limit={3} resolveTag={resolveTag} />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={(event) => {
              event.stopPropagation()
              handleToggleFavorite()
            }}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${link.isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
          >
            <Heart className={`w-5 h-5 ${link.isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation()
              handleVisit()
            }}
            className="flex items-center justify-center w-10 h-10 text-gray-400 hover:text-primary-600 rounded-full transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
          <CardMenu link={link} isOpen={isMenuOpen} onToggle={() => setIsMenuOpen((prev) => !prev)} onArchive={handleToggleArchive} />
        </div>
      </div>
    </div>
  </article>
)

const GridView = ({ link, swipeRef, isMenuOpen, setIsMenuOpen, handleVisit, handleToggleFavorite, handleToggleArchive, hasScrapingError, needsDescription, setShowDescriptionModal, resolveTag, onOpenDetail }) => (
  <div
    ref={swipeRef}
    className={`card hover:shadow-lg transition-all duration-200 group ${link.status === 'processing' ? 'opacity-75' : ''} cursor-pointer`}
    role="button"
    tabIndex={0}
    aria-labelledby={`link-${link._id}-title`}
    onClick={() => onOpenDetail?.(link)}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onOpenDetail?.(link)
      }
    }}
  >
    {link.status === 'processing' && (
      <div className="absolute top-2 right-2 z-10 flex items-center space-x-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <span>Procesando...</span>
      </div>
    )}

    {link.image ? (
      <div className="aspect-video overflow-hidden rounded-t-lg">
        <OptimizedImage
          src={link.image}
          alt={link.title}
          width={400}
          height={225}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          quality={75}
          isStored={link.imageIsStored}
          onError={(e) => {
            if (e.currentTarget.parentElement) {
              e.currentTarget.parentElement.style.display = 'none'
            }
          }}
        />
      </div>
    ) : (
      <div className="aspect-video rounded-t-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">Sin imagen</span>
      </div>
    )}

    <div className="p-4">
      <div className="flex items-start justify-between mb-2">
        <h3 id={`link-${link._id}-title`} className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1">{link.title}</h3>
        <button
          onClick={(event) => {
            event.stopPropagation()
            handleToggleFavorite()
          }}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ml-2 ${link.isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
        >
          <Heart className={`w-5 h-5 ${link.isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {hasScrapingError && (
        <div className="mb-2">
          <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full whitespace-nowrap flex items-center w-fit">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Error de scraping
          </span>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">Mostrando valores predeterminados.</p>
        </div>
      )}

      <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-3">{link.description || (hasScrapingError ? 'Descripción no disponible' : 'Sin descripción')}</p>

      {link.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          <TagsBadges tags={link.tags} limit={2} resolveTag={resolveTag} />
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <div className="flex items-center space-x-3">
          <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{formatDate(link.createdAt)}</span>
          {link.lastVisited && <span className="flex items-center"><Clock className="w-3 h-3 mr-1" />{formatDateTime(link.lastVisited)}</span>}
        </div>
        {link.clickCount > 0 && <span className="flex items-center"><Eye className="w-3 h-3 mr-1" />{link.clickCount}</span>}
      </div>

      {needsDescription && (
        <button
          onClick={(event) => {
            event.stopPropagation()
            setShowDescriptionModal(true)
          }}
          className="flex items-center mb-3 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded hover:bg-amber-100 transition-colors"
        >
          <AlertCircle className="w-3 h-3 mr-1" />
          Agregar descripción
        </button>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-primary-600 font-medium truncate flex items-center">{link.imageIsStored && <Cloud className="w-3 h-3 mr-1" />}{getDomainFromUrl(link.url)}</span>

        <div className="flex items-center space-x-1">
          <button
            onClick={(event) => {
              event.stopPropagation()
              handleVisit()
            }}
            className="btn-primary btn-sm flex items-center"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Visitar
          </button>
          <CardMenu link={link} isOpen={isMenuOpen} onToggle={() => setIsMenuOpen((prev) => !prev)} onArchive={handleToggleArchive} compact />
        </div>
      </div>
    </div>
  </div>
)

const LinkCard = ({ link, viewMode = 'grid', onUpdate, mode = 'full', onOpenDetail }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)

  const { toggleFavorite, incrementClickCount, toggleArchive } = useLinkStore()
  const { tags: allTags, fetchTags: fetchAllTags } = useTagStore()

  useEffect(() => {
    if (!allTags || allTags.length === 0) {
      fetchAllTags().catch(() => {})
    }
  }, [allTags, fetchAllTags])

  const resolveTag = (tagItem) => {
    if (typeof tagItem === 'object' && tagItem !== null) return tagItem
    if (typeof tagItem !== 'string') return tagItem

    const byId = allTags.find((tag) => tag._id === tagItem)
    if (byId) return byId

    const byName = allTags.find((tag) => tag.name === tagItem)
    return byName || tagItem
  }

  const handleVisit = async () => {
    await incrementClickCount(link._id)
    window.open(link.url, '_blank', 'noopener,noreferrer')
  }

  const handleToggleFavorite = async () => {
    await toggleFavorite(link._id)
    onUpdate?.()
  }

  const handleToggleArchive = async () => {
    await toggleArchive(link._id)
    setIsMenuOpen(false)
    onUpdate?.()
  }

  const hasScrapingError = link.status === 'error' || link.scrapingError
  const needsDescription = !link.description || link.description.trim() === ''

  const swipeRef = useSwipe(
    () => {
      onOpenDetail?.(link)
    },
    () => {
      handleToggleFavorite()
    },
    { minDistance: 50 }
  )

  let content = null
  if (mode === 'minimal') {
    content = <MinimalView link={link} handleVisit={handleVisit} handleToggleFavorite={handleToggleFavorite} />
  } else if (viewMode === 'list') {
    content = (
      <ListView
        link={link}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        handleVisit={handleVisit}
        handleToggleFavorite={handleToggleFavorite}
        handleToggleArchive={handleToggleArchive}
        hasScrapingError={hasScrapingError}
        needsDescription={needsDescription}
        setShowDescriptionModal={setShowDescriptionModal}
        resolveTag={resolveTag}
        onOpenDetail={onOpenDetail}
      />
    )
  } else {
    content = (
      <GridView
        link={link}
        swipeRef={swipeRef}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        handleVisit={handleVisit}
        handleToggleFavorite={handleToggleFavorite}
        handleToggleArchive={handleToggleArchive}
        hasScrapingError={hasScrapingError}
        needsDescription={needsDescription}
        setShowDescriptionModal={setShowDescriptionModal}
        resolveTag={resolveTag}
        onOpenDetail={onOpenDetail}
      />
    )
  }

  return (
    <>
      {content}

      {mode !== 'minimal' && (
        <>
          <Suspense fallback={<ModalFallback />}>
            <DescriptionModal link={link} isOpen={showDescriptionModal} onClose={() => setShowDescriptionModal(false)} onUpdate={onUpdate} />
          </Suspense>
        </>
      )}
    </>
  )
}

const LinkCardMemo = React.memo(LinkCard, (prevProps, nextProps) => {
  return (
    prevProps.link?._id === nextProps.link?._id &&
    prevProps.link?.isFavorite === nextProps.link?.isFavorite &&
    prevProps.link?.isArchived === nextProps.link?.isArchived &&
    prevProps.link?.clickCount === nextProps.link?.clickCount &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.mode === nextProps.mode &&
    prevProps.onOpenDetail === nextProps.onOpenDetail
  )
})

export default LinkCardMemo
