import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, Check, X, AlertCircle, Loader2 } from 'lucide-react'
import { useLinkStore } from '../stores/linkStore'
import linkService from '../services/linkService'
import OptimizedImage from './OptimizedImage'

const ReScrapeModal = ({ link, isOpen, onClose, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [scrapedData, setScrapedData] = useState(null)
  const [selectedFields, setSelectedFields] = useState({
    title: false,
    description: false,
    image: false
  })

  const { updateLink } = useLinkStore()

  // Calculate field differences and empty safeguards
  const diffInfo = useMemo(() => {
    if (!link || !scrapedData) {
      return {
        title: { isDifferent: false, isEmpty: true },
        description: { isDifferent: false, isEmpty: true },
        image: { isDifferent: false, isEmpty: true }
      }
    }

    const currentTitle = (link.title || '').trim()
    const scrapedTitle = (scrapedData.title || '').trim()
    const isTitleEmpty = !scrapedTitle
    const isTitleDiff = !isTitleEmpty && scrapedTitle !== currentTitle

    const currentDesc = (link.description || '').trim()
    const scrapedDesc = (scrapedData.description || '').trim()
    const isDescEmpty = !scrapedDesc
    const isDescDiff = !isDescEmpty && scrapedDesc !== currentDesc

    const currentImage = (link.image || '').trim()
    const scrapedImage = (scrapedData.image || '').trim()
    const isImageEmpty = !scrapedImage
    const isImageDiff = !isImageEmpty && scrapedImage !== currentImage

    return {
      title: { isDifferent: isTitleDiff, isEmpty: isTitleEmpty },
      description: { isDifferent: isDescDiff, isEmpty: isDescEmpty },
      image: { isDifferent: isImageDiff, isEmpty: isImageEmpty }
    }
  }, [link, scrapedData])

  const fetchScrapePreview = useCallback(async () => {
    if (!link?._id) return

    setIsLoading(true)
    setError(null)
    setScrapedData(null)

    try {
      const response = await linkService.scrapePreview(link._id)
      const data = response?.data || response

      setScrapedData(data)

      // Auto-select changed and non-empty fields
      const currentTitle = (link.title || '').trim()
      const scrapedTitle = (data.title || '').trim()
      const autoTitle = Boolean(scrapedTitle && scrapedTitle !== currentTitle)

      const currentDesc = (link.description || '').trim()
      const scrapedDesc = (data.description || '').trim()
      const autoDesc = Boolean(scrapedDesc && scrapedDesc !== currentDesc)

      const currentImage = (link.image || '').trim()
      const scrapedImage = (data.image || '').trim()
      const autoImage = Boolean(scrapedImage && scrapedImage !== currentImage)

      setSelectedFields({
        title: autoTitle,
        description: autoDesc,
        image: autoImage
      })
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al re-escanear enlace'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [link])

  useEffect(() => {
    if (isOpen && link?._id) {
      fetchScrapePreview()
    } else {
      setScrapedData(null)
      setError(null)
      setIsLoading(false)
      setIsSubmitting(false)
      setSelectedFields({ title: false, description: false, image: false })
    }
  }, [isOpen, link?._id, fetchScrapePreview])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen || !link) return null

  const handleFieldToggle = (field) => {
    if (diffInfo[field].isEmpty) return
    setSelectedFields((prev) => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleSelectAll = () => {
    setSelectedFields({
      title: !diffInfo.title.isEmpty,
      description: !diffInfo.description.isEmpty,
      image: !diffInfo.image.isEmpty
    })
  }

  const handleDeselectAll = () => {
    setSelectedFields({
      title: false,
      description: false,
      image: false
    })
  }

  const handleApplyChanges = async () => {
    const patch = {}
    if (selectedFields.title && scrapedData?.title) {
      patch.title = scrapedData.title
    }
    if (selectedFields.description && scrapedData?.description) {
      patch.description = scrapedData.description
    }
    if (selectedFields.image && scrapedData?.image) {
      patch.image = scrapedData.image
    }

    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }

    setIsSubmitting(true)
    try {
      const res = await updateLink(link._id, patch)
      if (res && res.success !== false) {
        onUpdate?.()
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasAnySelected = selectedFields.title || selectedFields.description || selectedFields.image

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rescrape-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose()
        }
      }}
    >
      <div className="relative w-full max-w-3xl bg-[var(--surface)] rounded-lg shadow-2xl border border-[var(--border-strong)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-2)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded border border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)]">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <span className="mono text-[9px] text-[var(--accent)] uppercase font-semibold block">
                METADATA DIFF // MERGE
              </span>
              <h2 id="rescrape-modal-title" className="text-lg font-bold font-sans tracking-tight text-[var(--text)]">
                Re-escanear enlace
              </h2>
              <p className="mono text-[10px] text-[var(--muted)] truncate max-w-md">
                {link.url}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal"
            className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] rounded border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading && (
            <div
              data-testid="rescrape-loading-skeleton"
              className="space-y-4 py-8 flex flex-col items-center justify-center text-center"
            >
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-2" />
              <h3 className="text-base font-bold font-sans text-[var(--text)]">
                Obteniendo vista previa del enlace...
              </h3>
              <p className="mono text-[11px] text-[var(--muted)] max-w-sm">
                Extrayendo en memoria el título, descripción e imagen actualizados desde el sitio web remoto.
              </p>

              <div className="w-full max-w-md space-y-2.5 mt-4">
                <div className="h-10 loading-skeleton rounded" />
                <div className="h-16 loading-skeleton rounded" />
                <div className="h-24 loading-skeleton rounded" />
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 rounded border border-[var(--danger)]/50 bg-[var(--danger)]/10 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-[var(--danger)]">
                  <p className="font-semibold font-mono uppercase">No se pudo re-escanear el enlace</p>
                  <p className="mt-1 font-mono">{error}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  data-testid="btn-retry-rescrape"
                  onClick={fetchScrapePreview}
                  className="btn-outline btn-sm text-[var(--danger)] flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && scrapedData && (
            <div className="space-y-5">
              {/* Quick toolbar */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] text-xs font-mono">
                <span className="text-[var(--muted)] text-[11px]">
                  Selecciona los campos para aplicar al enlace guardado:
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    data-testid="btn-select-all"
                    onClick={handleSelectAll}
                    className="text-[var(--accent)] hover:underline font-semibold cursor-pointer"
                  >
                    Seleccionar cambios
                  </button>
                  <span className="text-[var(--border)]">|</span>
                  <button
                    type="button"
                    data-testid="btn-deselect-all"
                    onClick={handleDeselectAll}
                    className="text-[var(--muted)] hover:text-[var(--text)] hover:underline cursor-pointer"
                  >
                    Deseleccionar todo
                  </button>
                </div>
              </div>

              {/* Comparison Grid */}
              <div className="space-y-4">
                {/* Title Diff */}
                <div
                  className={`p-4 rounded border transition-all ${
                    selectedFields.title
                      ? 'border-[var(--accent)] bg-[var(--surface-2)] shadow-sm'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="mono text-[10px] font-semibold uppercase text-[var(--muted)]">
                        Título
                      </span>
                      {diffInfo.title.isDifferent ? (
                        <span className="mono text-[9px] bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 px-1.5 py-0.5 rounded font-semibold">
                          MODIFICADO
                        </span>
                      ) : (
                        <span className="mono text-[9px] text-[var(--subtle)] border border-[var(--border)] px-1.5 py-0.5 rounded">
                          SIN CAMBIOS
                        </span>
                      )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        data-testid="checkbox-title"
                        checked={selectedFields.title}
                        disabled={diffInfo.title.isEmpty}
                        onChange={() => handleFieldToggle('title')}
                        className="rounded border-[var(--border)] text-[var(--accent)] h-4 w-4 disabled:opacity-40"
                      />
                      <span className="mono text-[10px] text-[var(--muted)]">
                        {diffInfo.title.isEmpty ? 'No disponible' : 'Aplicar cambio'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[var(--surface-2)] rounded border border-[var(--border)]">
                      <p className="mono text-[9px] text-[var(--muted)] uppercase mb-1">
                        Valor actual
                      </p>
                      <p className="text-[var(--text)] font-sans font-medium break-words">
                        {link.title || <span className="italic text-[var(--muted)]">Sin título</span>}
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded border transition-colors ${
                        diffInfo.title.isDifferent
                          ? 'border-[var(--accent)]/50 bg-[var(--surface-3)]'
                          : 'bg-[var(--surface-2)] border-[var(--border)]'
                      }`}
                    >
                      <p className={`mono text-[9px] uppercase mb-1 ${diffInfo.title.isDifferent ? 'text-[var(--accent)] font-semibold' : 'text-[var(--muted)]'}`}>
                        Nuevo valor (Scraped)
                      </p>
                      <p className={`break-words font-sans ${diffInfo.title.isDifferent ? 'text-[var(--text)] font-semibold' : 'text-[var(--text)]'}`}>
                        {scrapedData.title || '(vacío)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description Diff */}
                <div
                  className={`p-4 rounded border transition-all ${
                    selectedFields.description
                      ? 'border-[var(--accent)] bg-[var(--surface-2)] shadow-sm'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="mono text-[10px] font-semibold uppercase text-[var(--muted)]">
                        Descripción
                      </span>
                      {diffInfo.description.isDifferent ? (
                        <span className="mono text-[9px] bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 px-1.5 py-0.5 rounded font-semibold">
                          MODIFICADO
                        </span>
                      ) : (
                        <span className="mono text-[9px] text-[var(--subtle)] border border-[var(--border)] px-1.5 py-0.5 rounded">
                          SIN CAMBIOS
                        </span>
                      )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        data-testid="checkbox-description"
                        checked={selectedFields.description}
                        disabled={diffInfo.description.isEmpty}
                        onChange={() => handleFieldToggle('description')}
                        className="rounded border-[var(--border)] text-[var(--accent)] h-4 w-4 disabled:opacity-40"
                      />
                      <span className="mono text-[10px] text-[var(--muted)]">
                        {diffInfo.description.isEmpty ? 'No disponible' : 'Aplicar cambio'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[var(--surface-2)] rounded border border-[var(--border)]">
                      <p className="mono text-[9px] text-[var(--muted)] uppercase mb-1">
                        Valor actual
                      </p>
                      <p className="text-[var(--text)] line-clamp-4 break-words leading-relaxed">
                        {link.description || <span className="italic text-[var(--muted)]">Sin descripción</span>}
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded border transition-colors ${
                        diffInfo.description.isDifferent
                          ? 'border-[var(--accent)]/50 bg-[var(--surface-3)]'
                          : 'bg-[var(--surface-2)] border-[var(--border)]'
                      }`}
                    >
                      <p className={`mono text-[9px] uppercase mb-1 ${diffInfo.description.isDifferent ? 'text-[var(--accent)] font-semibold' : 'text-[var(--muted)]'}`}>
                        Nuevo valor (Scraped)
                      </p>
                      <p className={`line-clamp-4 break-words leading-relaxed ${diffInfo.description.isDifferent ? 'text-[var(--text)] font-medium' : 'text-[var(--text)]'}`}>
                        {scrapedData.description || '(vacío)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Image Diff */}
                <div
                  className={`p-4 rounded border transition-all ${
                    selectedFields.image
                      ? 'border-[var(--accent)] bg-[var(--surface-2)] shadow-sm'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="mono text-[10px] font-semibold uppercase text-[var(--muted)]">
                        Imagen de portada
                      </span>
                      {diffInfo.image.isDifferent ? (
                        <span className="mono text-[9px] bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 px-1.5 py-0.5 rounded font-semibold">
                          MODIFICADO
                        </span>
                      ) : (
                        <span className="mono text-[9px] text-[var(--subtle)] border border-[var(--border)] px-1.5 py-0.5 rounded">
                          SIN CAMBIOS
                        </span>
                      )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        data-testid="checkbox-image"
                        checked={selectedFields.image}
                        disabled={diffInfo.image.isEmpty}
                        onChange={() => handleFieldToggle('image')}
                        className="rounded border-[var(--border)] text-[var(--accent)] h-4 w-4 disabled:opacity-40"
                      />
                      <span className="mono text-[10px] text-[var(--muted)]">
                        {diffInfo.image.isEmpty ? 'No disponible' : 'Aplicar cambio'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[var(--surface-2)] rounded border border-[var(--border)]">
                      <p className="mono text-[9px] text-[var(--muted)] uppercase mb-2">
                        Valor actual
                      </p>
                      {link.image ? (
                        <OptimizedImage
                          src={link.image}
                          alt="Imagen actual"
                          width={300}
                          height={140}
                          className="w-full h-28 object-cover rounded border border-[var(--border)]"
                          isStored={link.imageIsStored}
                        />
                      ) : (
                        <div className="w-full h-28 rounded border border-dashed border-[var(--border)] flex items-center justify-center mono text-[10px] text-[var(--muted)]">
                          Sin imagen
                        </div>
                      )}
                    </div>

                    <div
                      className={`p-3 rounded border transition-colors ${
                        diffInfo.image.isDifferent
                          ? 'border-[var(--accent)]/50 bg-[var(--surface-3)]'
                          : 'bg-[var(--surface-2)] border-[var(--border)]'
                      }`}
                    >
                      <p className={`mono text-[9px] uppercase mb-2 ${diffInfo.image.isDifferent ? 'text-[var(--accent)] font-semibold' : 'text-[var(--muted)]'}`}>
                        Nuevo valor (Scraped)
                      </p>
                      {scrapedData.image ? (
                        <OptimizedImage
                          src={scrapedData.image}
                          alt="Nueva imagen"
                          width={300}
                          height={140}
                          className="w-full h-28 object-cover rounded border border-[var(--border)]"
                        />
                      ) : (
                        <div className="w-full h-28 rounded border border-dashed border-[var(--border)] flex items-center justify-center mono text-[10px] text-[var(--muted)]">
                          Sin imagen extraída
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-2)]">
          <button
            type="button"
            data-testid="btn-cancel-rescrape"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-outline btn-md"
          >
            Cancelar
          </button>

          <button
            type="button"
            data-testid="btn-apply-changes"
            onClick={handleApplyChanges}
            disabled={isLoading || isSubmitting || !scrapedData || !hasAnySelected}
            className="btn-primary btn-md flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Aplicar cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReScrapeModal
