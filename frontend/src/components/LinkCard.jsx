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
  Loader,
  RefreshCw,
  MoreVertical
} from 'lucide-react'

const DescriptionModal = lazy(() => import('./DescriptionModal'))
const ReScrapeModal = lazy(() => import('./ReScrapeModal'))

const ModalFallback = () => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg p-6 shadow-2xl">
      <div className="flex items-center gap-2.5 font-mono text-xs text-[var(--text)]">
        <Loader className="w-4 h-4 animate-spin text-[var(--accent)]" />
        <span>Cargando...</span>
      </div>
    </div>
  </div>
)

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

const formatDateTime = (date) => {
  if (!date) return null
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${year} - ${hours}:${minutes}`
}

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

const CardMenu = ({ link, isOpen, onToggle, onArchive, onReScrape }) => (
  <div className="relative">
    <button
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      className="flex items-center justify-center w-8 h-8 rounded border border-[var(--border)] bg-[var(--surface-2)]/90 text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
      aria-label="Abrir menú"
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      <MoreVertical className="w-4 h-4" />
    </button>

    {isOpen && (
      <div className="absolute right-0 mt-1.5 w-44 bg-[var(--surface)] rounded border border-[var(--border-strong)] shadow-xl z-30 py-1 font-mono text-xs animate-fade-in">
        <button
          onClick={(event) => {
            event.stopPropagation()
            onReScrape?.()
          }}
          className="flex items-center w-full px-3 py-2 text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors text-left cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-2 text-[var(--accent)]" />
          Re-escanear
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onArchive()
          }}
          className="flex items-center w-full px-3 py-2 text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors text-left cursor-pointer"
        >
          <Archive className="w-3.5 h-3.5 mr-2 text-[var(--muted)]" />
          {link.isArchived ? 'Desarchivar' : 'Archivar'}
        </button>
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
            className="badge-secondary font-mono text-[10px]"
            style={color ? { backgroundColor: color, color: textColor, borderColor: color } : undefined}
          >
            #{name}
          </span>
        )
      })}
      {tags.length > limit && (
        <span className="badge-secondary font-mono text-[9px] opacity-75">
          +{tags.length - limit}
        </span>
      )}
    </>
  )
}

const MinimalView = ({ link, handleVisit, handleToggleFavorite }) => (
  <article className="card p-3 flex items-center justify-between" role="article" aria-labelledby={`link-${link._id}-title`}>
    <div className="flex items-center gap-3 min-w-0">
      <div id={`link-${link._id}-title`} className="mono text-xs font-semibold text-[var(--text)] truncate max-w-xs">
        {getDomainFromUrl(link.url)}
      </div>
      {link.clickCount > 0 && (
        <div className="mono text-[10px] text-[var(--muted)] flex items-center">
          <Eye className="w-3.5 h-3.5 mr-1 text-[var(--muted)]" />
          {link.clickCount}
        </div>
      )}
    </div>

    <div className="flex items-center gap-1.5">
      <button
        onClick={handleVisit}
        className="p-1.5 text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
        title="Visitar enlace"
        aria-label={`Visitar enlace: ${link.title}`}
      >
        <ExternalLink className="w-4 h-4" />
      </button>
      <button
        onClick={handleToggleFavorite}
        className={`p-1.5 transition-colors ${link.isFavorite ? 'text-red-500' : 'text-[var(--muted)] hover:text-red-500'}`}
        title={link.isFavorite ? 'Remover de favoritos' : 'Agregar a favoritos'}
        aria-label={link.isFavorite ? `Remover ${link.title} de favoritos` : `Agregar ${link.title} a favoritos`}
        aria-pressed={link.isFavorite}
      >
        <Heart className={`w-4 h-4 ${link.isFavorite ? 'fill-current' : ''}`} />
      </button>
    </div>
  </article>
)

const ListView = ({
  link,
  isMenuOpen,
  setIsMenuOpen,
  handleVisit,
  handleToggleFavorite,
  handleToggleArchive,
  handleReScrape,
  hasScrapingError,
  needsDescription,
  setShowDescriptionModal,
  resolveTag,
  onOpenDetail
}) => (
  <article
    className="w-full flex items-center justify-between p-3.5 border-b border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer group"
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
    <div className="flex items-center gap-3.5 min-w-0 flex-1">
      {/* Thumbnail */}
      <div className="w-16 h-12 rounded border border-[var(--border)] overflow-hidden bg-[var(--surface-2)] flex-shrink-0 relative">
        <OptimizedImage
          src={link.image}
          alt={link.title}
          width={100}
          height={75}
          className="w-full h-full object-cover filter saturate-85 group-hover:saturate-100 transition-all"
          quality={70}
          isStored={link.imageIsStored}
        />
        {link.imageIsStored && (
          <span className="absolute bottom-0.5 right-0.5 p-0.5 bg-black/70 rounded">
            <Cloud className="w-2.5 h-2.5 text-[var(--accent)]" />
          </span>
        )}
      </div>

      {/* Main Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="mono text-[10px] text-[var(--muted)] truncate max-w-[200px]">
            {getDomainFromUrl(link.url)}
          </span>
          {link.status === 'processing' && (
            <span className="badge-primary font-mono text-[9px] py-0">Procesando...</span>
          )}
          {hasScrapingError && (
            <span className="badge-warning font-mono text-[9px] py-0 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" /> Error
            </span>
          )}
          {link.isArchived && (
            <span className="mono text-[9px] text-[var(--muted)] border border-[var(--border)] px-1 rounded">
              ARCHIVADO
            </span>
          )}
        </div>

        <h3 id={`link-${link._id}-title`} className="font-sans font-semibold text-sm text-[var(--text)] tracking-tight truncate mt-0.5">
          {link.title || 'Sin título'}
        </h3>

        <p className="text-xs text-[var(--muted)] line-clamp-1 max-w-xl hidden sm:block mt-0.5">
          {link.description || 'Sin descripción disponible'}
        </p>

        {needsDescription && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowDescriptionModal(true)
            }}
            className="mono text-[9px] text-amber-500 hover:underline flex items-center gap-1 mt-1"
          >
            <AlertCircle className="w-2.5 h-2.5" /> Agregar descripción
          </button>
        )}
      </div>

      {/* Tags */}
      {link.tags?.length > 0 && (
        <div className="hidden lg:flex items-center gap-1 max-w-xs overflow-hidden flex-shrink-0">
          <TagsBadges tags={link.tags} limit={2} resolveTag={resolveTag} />
        </div>
      )}

      {/* Monospace Metadata */}
      <div className="hidden md:flex flex-col items-end mono text-[10px] text-[var(--muted)] flex-shrink-0 pr-4">
        <span>{formatDate(link.createdAt)}</span>
        {link.clickCount > 0 && (
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> {link.clickCount}
          </span>
        )}
      </div>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-1 flex-shrink-0 pl-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          handleToggleFavorite()
        }}
        className={`p-2 rounded hover:bg-[var(--surface-2)] transition-colors ${link.isFavorite ? 'text-red-500' : 'text-[var(--muted)] hover:text-red-500'}`}
        title={link.isFavorite ? 'Remover favorito' : 'Favorito'}
      >
        <Heart className={`w-4 h-4 ${link.isFavorite ? 'fill-current' : ''}`} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          handleVisit()
        }}
        className="p-2 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        title="Visitar enlace"
      >
        <ExternalLink className="w-4 h-4" />
      </button>
      <CardMenu
        link={link}
        isOpen={isMenuOpen}
        onToggle={() => setIsMenuOpen((prev) => !prev)}
        onArchive={handleToggleArchive}
        onReScrape={handleReScrape}
      />
    </div>
  </article>
)

const GridView = ({
  link,
  swipeRef,
  isMenuOpen,
  setIsMenuOpen,
  handleVisit,
  handleToggleFavorite,
  handleToggleArchive,
  handleReScrape,
  hasScrapingError,
  needsDescription,
  setShowDescriptionModal,
  resolveTag,
  onOpenDetail
}) => (
  <div
    ref={swipeRef}
    className={`break-inside-avoid mb-4 w-full card group overflow-hidden cursor-pointer hover:border-[var(--border-strong)] transition-all duration-180 hover:-translate-y-0.5 ${
      link.isArchived ? 'opacity-70' : ''
    }`}
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
    {/* Preview Image with Status badges and overlay */}
    <div className="relative aspect-video w-full overflow-hidden bg-[var(--surface-2)] border-b border-[var(--border)]">
      <OptimizedImage
        src={link.image}
        alt={link.title}
        width={400}
        height={225}
        className="w-full h-full object-cover filter saturate-85 group-hover:saturate-100 group-hover:scale-102 transition-all duration-200"
        quality={75}
        isStored={link.imageIsStored}
      />

      {/* Floating Status Badges */}
      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
        {link.status === 'processing' && (
          <span className="mono text-[9px] bg-black/80 text-[var(--accent)] border border-[var(--accent)]/40 px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            PROCESANDO
          </span>
        )}
        {hasScrapingError && (
          <span className="mono text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1 font-semibold">
            <AlertTriangle className="w-3 h-3" /> ERROR SCRAPING
          </span>
        )}
        {link.isArchived && (
          <span className="mono text-[9px] bg-black/80 text-[var(--muted)] border border-[var(--border)] px-1.5 py-0.5 rounded backdrop-blur-xs">
            ARCHIVADO
          </span>
        )}
      </div>

      {link.imageIsStored && (
        <span className="absolute top-2 right-2 mono text-[8px] bg-black/80 text-white border border-white/20 px-1.5 py-0.5 rounded flex items-center gap-1 z-10 backdrop-blur-xs">
          <Cloud className="w-2.5 h-2.5 text-[var(--accent)]" /> LOCAL
        </span>
      )}

      {/* Quick hover action bar */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleToggleFavorite()
          }}
          className={`w-7 h-7 rounded border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xs flex items-center justify-center transition-colors ${
            link.isFavorite ? 'text-red-500' : 'text-[var(--text)] hover:text-red-500'
          }`}
          title={link.isFavorite ? 'Remover favorito' : 'Favorito'}
        >
          <Heart className={`w-3.5 h-3.5 ${link.isFavorite ? 'fill-current' : ''}`} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleVisit()
          }}
          className="w-7 h-7 rounded border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xs flex items-center justify-center text-[var(--text)] hover:text-[var(--accent)] transition-colors"
          title="Visitar enlace"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <CardMenu
          link={link}
          isOpen={isMenuOpen}
          onToggle={() => setIsMenuOpen((prev) => !prev)}
          onArchive={handleToggleArchive}
          onReScrape={handleReScrape}
        />
      </div>
    </div>

    {/* Body Content */}
    <div className="p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="mono text-[10px] text-[var(--muted)] truncate max-w-[80%] uppercase font-semibold">
          {getDomainFromUrl(link.url)}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleToggleFavorite()
          }}
          className={`transition-colors ${link.isFavorite ? 'text-red-500' : 'text-[var(--muted)] hover:text-red-500'}`}
        >
          <Heart className={`w-4 h-4 ${link.isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      <h3 id={`link-${link._id}-title`} className="font-sans font-bold text-base text-[var(--text)] tracking-tight line-clamp-2 leading-snug">
        {link.title || 'Sin título'}
      </h3>

      <p className="text-xs text-[var(--muted)] line-clamp-3 leading-relaxed">
        {link.description || (hasScrapingError ? 'Descripción no disponible tras el escaneo.' : 'Sin descripción registrada.')}
      </p>

      {needsDescription && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowDescriptionModal(true)
          }}
          className="mono text-[9px] text-amber-500 hover:underline flex items-center gap-1"
        >
          <AlertCircle className="w-2.5 h-2.5" /> Agregar descripción
        </button>
      )}

      {/* Tags */}
      {link.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          <TagsBadges tags={link.tags} limit={3} resolveTag={resolveTag} />
        </div>
      )}

      {/* Card Metadata Footer */}
      <div className="border-t border-[var(--border)] pt-2.5 mt-3 flex items-center justify-between font-mono text-[10px] text-[var(--muted)]">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-[var(--muted)]" />
          {formatDate(link.createdAt)}
        </span>
        <div className="flex items-center gap-2">
          {link.lastVisited && (
            <span className="hidden sm:flex items-center gap-1" title={`Última visita: ${formatDateTime(link.lastVisited)}`}>
              <Clock className="w-3 h-3 text-[var(--muted)]" />
              {formatDate(link.lastVisited)}
            </span>
          )}
          {link.clickCount > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-[var(--muted)]" />
              {link.clickCount}
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
)

const LinkCard = ({ link, viewMode = 'grid', onUpdate, mode = 'full', onOpenDetail }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [showReScrapeModal, setShowReScrapeModal] = useState(false)

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

  const handleReScrape = () => {
    setIsMenuOpen(false)
    setShowReScrapeModal(true)
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
        handleReScrape={handleReScrape}
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
        handleReScrape={handleReScrape}
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
            <DescriptionModal
              link={link}
              isOpen={showDescriptionModal}
              onClose={() => setShowDescriptionModal(false)}
              onUpdate={onUpdate}
            />
          </Suspense>
          <Suspense fallback={<ModalFallback />}>
            <ReScrapeModal
              link={link}
              isOpen={showReScrapeModal}
              onClose={() => setShowReScrapeModal(false)}
              onUpdate={onUpdate}
            />
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
    prevProps.link?.status === nextProps.link?.status &&
    prevProps.link?.image === nextProps.link?.image &&
    prevProps.link?.title === nextProps.link?.title &&
    prevProps.link?.description === nextProps.link?.description &&
    prevProps.link?.scrapingError === nextProps.link?.scrapingError &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.mode === nextProps.mode &&
    prevProps.onOpenDetail === nextProps.onOpenDetail
  )
})

export default LinkCardMemo
