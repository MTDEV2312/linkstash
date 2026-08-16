import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, Check, X, AlertCircle, AlertTriangle, Image as ImageIcon, Loader2 } from 'lucide-react'
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rescrape-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose()
        }
      }}
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 rounded-lg border border-primary-200/50 dark:border-primary-800/40">
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 id="rescrape-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                Re-escanear enlace
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">
                {link.url}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading && (
            <div
              data-testid="rescrape-loading-skeleton"
              className="space-y-4 py-8 flex flex-col items-center justify-center text-center"
            >
              <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-3" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                Obteniendo vista previa del enlace...
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                Extrayendo en memoria el título, descripción e imagen actualizados desde el sitio web remoto.
              </p>

              <div className="w-full max-w-md space-y-3 mt-4 animate-pulse">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/60 rounded-xl space-y-3">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-red-700 dark:text-red-300">
                  <p className="font-medium">No se pudo re-escanear el enlace</p>
                  <p className="text-xs mt-1 text-red-600 dark:text-red-400">{error}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  data-testid="btn-retry-rescrape"
                  onClick={fetchScrapePreview}
                  className="btn-outline btn-sm text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && scrapedData && (
            <div className="space-y-6">
              {/* Quick toolbar */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  Selecciona los campos que deseas actualizar en tu enlace guardado:
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    data-testid="btn-select-all"
                    onClick={handleSelectAll}
                    className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                  >
                    Seleccionar cambios
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    type="button"
                    data-testid="btn-deselect-all"
                    onClick={handleDeselectAll}
                    className="text-gray-500 dark:text-gray-400 hover:underline"
                  >
                    Deseleccionar todo
                  </button>
                </div>
              </div>

              {/* Comparison Table / Grid */}
              <div className="space-y-4">
                {/* Title Diff */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    selectedFields.title
                      ? 'border-primary-500 dark:border-primary-500 bg-primary-50/30 dark:bg-primary-900/20 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Título
                      </span>
                      {diffInfo.title.isDifferent && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50 font-semibold px-2 py-0.5 rounded-full">
                          Modificado
                        </span>
                      )}
                    </div>
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        data-testid="checkbox-title"
                        checked={selectedFields.title}
                        disabled={diffInfo.title.isEmpty}
                        onChange={() => handleFieldToggle('title')}
                        className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-primary-600 focus:ring-primary-500 dark:focus:ring-offset-gray-800 h-4 w-4 disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                      <span
                        className={`text-xs font-medium ${
                          diffInfo.title.isEmpty
                            ? 'text-gray-400 dark:text-gray-500'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {diffInfo.title.isEmpty ? 'No disponible' : 'Aplicar cambio'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="p-3.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                        Valor actual
                      </p>
                      <p className="text-gray-900 dark:text-gray-100 font-medium break-words">
                        {link.title || <span className="italic text-gray-400 dark:text-gray-500">Sin título</span>}
                      </p>
                    </div>
                    <div
                      className={`p-3.5 rounded-lg border transition-colors ${
                        diffInfo.title.isDifferent
                          ? 'bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700/60'
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <p
                        className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
                          diffInfo.title.isDifferent
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        Nuevo valor (Scraped)
                      </p>
                      <p
                        className={`break-words ${
                          diffInfo.title.isEmpty
                            ? 'italic text-gray-400 dark:text-gray-500'
                            : diffInfo.title.isDifferent
                            ? 'text-emerald-950 dark:text-emerald-200 font-medium'
                            : 'text-gray-900 dark:text-gray-100 font-medium'
                        }`}
                      >
                        {scrapedData.title || '(vacío)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description Diff */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    selectedFields.description
                      ? 'border-primary-500 dark:border-primary-500 bg-primary-50/30 dark:bg-primary-900/20 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Descripción
                      </span>
                      {diffInfo.description.isDifferent && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50 font-semibold px-2 py-0.5 rounded-full">
                          Modificado
                        </span>
                      )}
                    </div>
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        data-testid="checkbox-description"
                        checked={selectedFields.description}
                        disabled={diffInfo.description.isEmpty}
                        onChange={() => handleFieldToggle('description')}
                        className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-primary-600 focus:ring-primary-500 dark:focus:ring-offset-gray-800 h-4 w-4 disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                      <span
                        className={`text-xs font-medium ${
                          diffInfo.description.isEmpty
                            ? 'text-gray-400 dark:text-gray-500'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {diffInfo.description.isEmpty ? 'No disponible' : 'Aplicar cambio'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="p-3.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                        Valor actual
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 text-xs line-clamp-4 break-words leading-relaxed">
                        {link.description || <span className="italic text-gray-400 dark:text-gray-500">Sin descripción</span>}
                      </p>
                    </div>
                    <div
                      className={`p-3.5 rounded-lg border transition-colors ${
                        diffInfo.description.isDifferent
                          ? 'bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700/60'
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <p
                        className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
                          diffInfo.description.isDifferent
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        Nuevo valor (Scraped)
                      </p>
                      <p
                        className={`text-xs line-clamp-4 break-words leading-relaxed ${
                          diffInfo.description.isEmpty
                            ? 'italic text-gray-400 dark:text-gray-500'
                            : diffInfo.description.isDifferent
                            ? 'text-emerald-950 dark:text-emerald-200 font-medium'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {scrapedData.description || '(vacío)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Image Diff */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    selectedFields.image
                      ? 'border-primary-500 dark:border-primary-500 bg-primary-50/30 dark:bg-primary-900/20 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Imagen de portada
                      </span>
                      {diffInfo.image.isDifferent && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50 font-semibold px-2 py-0.5 rounded-full">
                          Modificado
                        </span>
                      )}
                    </div>
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        data-testid="checkbox-image"
                        checked={selectedFields.image}
                        disabled={diffInfo.image.isEmpty}
                        onChange={() => handleFieldToggle('image')}
                        className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-primary-600 focus:ring-primary-500 dark:focus:ring-offset-gray-800 h-4 w-4 disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                      <span
                        className={`text-xs font-medium ${
                          diffInfo.image.isEmpty
                            ? 'text-gray-400 dark:text-gray-500'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {diffInfo.image.isEmpty ? 'No disponible' : 'Aplicar cambio'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="p-3.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                        Valor actual
                      </p>
                      {link.image ? (
                        <OptimizedImage
                          src={link.image}
                          alt="Imagen actual"
                          width={300}
                          height={140}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                          isStored={link.imageIsStored}
                        />
                      ) : (
                        <div className="w-full h-32 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 flex flex-col items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                          <ImageIcon className="w-6 h-6 mb-1 text-gray-400 dark:text-gray-500" />
                          Sin imagen
                        </div>
                      )}
                    </div>

                    <div
                      className={`p-3.5 rounded-lg border transition-colors ${
                        diffInfo.image.isDifferent
                          ? 'bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700/60'
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <p
                        className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${
                          diffInfo.image.isDifferent
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        Nuevo valor (Scraped)
                      </p>
                      {scrapedData.image ? (
                        <OptimizedImage
                          src={scrapedData.image}
                          alt="Nueva imagen"
                          width={300}
                          height={140}
                          className="w-full h-32 object-cover rounded-lg border border-emerald-300 dark:border-emerald-700/60"
                        />
                      ) : (
                        <div className="w-full h-32 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 flex flex-col items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                          <ImageIcon className="w-6 h-6 mb-1 text-gray-400 dark:text-gray-500" />
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/90">
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
            className="btn-primary btn-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
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
