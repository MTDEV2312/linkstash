import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useLinkStore } from '../stores/linkStore'
import useTagStore from '../stores/tagStore'
import ExistingTagsMenu from './ExistingTagsMenu'
import { linkFormRules, normalizeUrl, linkValidators } from '../utils/linkValidators'
import { X, Link as LinkIcon, FileText, Loader2, ArrowRight, Check, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

const FaviconBadge = ({ domain, src }) => {
  const [hasError, setHasError] = useState(false)
  const initialLetter = (domain?.[0] || 'U').toUpperCase()

  if (hasError || !src) {
    return (
      <span
        aria-hidden="true"
        className="w-5 h-5 rounded bg-[var(--surface-3)] border border-[var(--border)] text-[var(--accent)] font-mono font-bold text-[10px] flex items-center justify-center shrink-0"
      >
        {initialLetter}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt="Favicon"
      data-testid="favicon-badge-img"
      width={18}
      height={18}
      className="w-4.5 h-4.5 rounded-xs shrink-0 object-contain"
      onError={() => setHasError(true)}
      loading="lazy"
    />
  )
}

const LinkForm = ({ onSave, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { saveLink, fetchLinks } = useLinkStore()
  const { tags, fetchTags, refetchTags, markTagsForRefresh } = useTagStore()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      url: '',
      title: '',
      description: ''
    }
  })

  const watchedUrl = watch('url')
  const watchedTitle = watch('title')
  const watchedDescription = watch('description')

  useEffect(() => {
    if (!tags || tags.length === 0) {
      fetchTags()
    }
  }, [])

  const isValidUrl = (string) => linkValidators.isValidUrl(string)

  const urlPreview = useMemo(() => {
    if (!watchedUrl || typeof watchedUrl !== 'string') return null
    const trimmed = watchedUrl.trim()
    // Require a realistic domain pattern before parsing URL preview
    if (
      !/^https?:\/\/[a-zA-Z0-9-.]+\.[a-zA-Z]{2,}/i.test(trimmed) &&
      !/^[a-zA-Z0-9-.]+\.[a-zA-Z]{2,}/i.test(trimmed)
    ) {
      return null
    }

    try {
      const normalized = normalizeUrl(trimmed)
      const urlObj = new URL(normalized)
      if (!urlObj.hostname || !urlObj.hostname.includes('.')) return null
      return {
        domain: urlObj.hostname,
        favicon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`,
        isSecure: normalized.startsWith('https://')
      }
    } catch {
      return null
    }
  }, [watchedUrl])

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    setServerError(null)

    try {
      const linkData = {
        url: normalizeUrl(data.url),
        title: data.title?.trim() || '',
        description: data.description?.trim() || '',
        tags: selectedTags
      }

      if (!isValidUrl(linkData.url)) {
        toast.error('URL inválida')
        setIsSubmitting(false)
        return
      }

      const result = await saveLink(linkData)

      if (result && result.success) {
        setServerError(null)
        await fetchLinks?.()
        markTagsForRefresh()
        await refetchTags()
        toast.success('Enlace guardado en el archivo')
        onSave?.(result.link)
      } else {
        setServerError(result?.message || 'Error al guardar el enlace')
      }
    } catch {
      setServerError('Error inesperado al guardar el enlace')
      toast.error('Error inesperado al guardar el enlace')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header editorial */}
      <div className="flex items-start justify-between pb-4 border-b border-[var(--border)]">
        <div>
          <span className="mono text-[10px] text-[var(--accent)] font-semibold uppercase tracking-wider block mb-1">
            NEW PIECE / URL
          </span>
          <h2 id="link-form-title" className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-[var(--text)]">
            PASTE SOMETHING FROM THE WEB
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cerrar formulario"
          className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {serverError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500 font-mono">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Campo URL principal */}
        <div className="space-y-1.5">
          <label htmlFor="url" className="block text-xs font-mono font-medium text-[var(--muted)] tracking-wider">
            URL DEL ENLACE *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)] z-10">
              <LinkIcon className="h-5 w-5" />
            </div>
            <input
              {...register('url', linkFormRules.url)}
              id="url"
              type="url"
              autoFocus
              className={`input input-has-left-icon font-mono text-sm ${
                errors.url ? 'border-[var(--danger)] focus:border-[var(--danger)]' : ''
              }`}
              placeholder="https://ejemplo.com/articulo (URL)"
            />
          </div>
          {errors.url && (
            <p className="text-xs text-[var(--danger)] font-mono mt-1" role="alert">
              {errors.url.message}
            </p>
          )}

          {/* Tarjeta de preview instantáneo de la URL */}
          {urlPreview && (
            <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded flex items-center justify-between gap-3 text-xs mt-2 animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <FaviconBadge
                  src={urlPreview.favicon}
                  domain={urlPreview.domain}
                />
                <div className="min-w-0">
                  <span className="font-mono font-medium text-[var(--text)] block truncate">
                    {urlPreview.domain}
                  </span>
                  <span className="mono text-[10px] text-[var(--muted)] block">
                    {urlPreview.isSecure ? 'URL VERIFIED / HTTPS SECURE' : 'URL VERIFIED / HTTP'}
                  </span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1 text-[var(--accent)] text-xs font-mono">
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">VÁLIDA</span>
              </div>
            </div>
          )}

          <p className="text-xs text-[var(--muted)] leading-relaxed mt-1">
            LinkStash extraerá el título, resumen, imagen y metadatos automáticamente de la página.
          </p>
        </div>

        {/* Sección de metadatos opcionales / manuales */}
        <div className="border border-[var(--border)] rounded-lg bg-[var(--surface-2)]/40 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-[var(--text)] tracking-wider">
              METADATOS OPCIONALES Y ETIQUETAS
            </span>
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="text-xs font-mono text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{showAdvanced ? 'Ocultar campos' : 'Personalizar campos'}</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-[var(--border)] animate-fade-in">
              {/* Título opcional */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="title" className="block text-xs font-mono text-[var(--muted)]">
                    TÍTULO MANUAL
                  </label>
                  {watchedTitle && (
                    <span className="text-[10px] font-mono text-[var(--muted)]">
                      {watchedTitle.length}/200
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)] z-10">
                    <FileText className="h-4 w-4" />
                  </div>
                  <input
                    {...register('title', linkFormRules.title)}
                    id="title"
                    type="text"
                    className="input input-has-left-icon text-xs"
                    placeholder="Título del enlace (opcional)"
                  />
                </div>
                {errors.title && (
                  <p className="text-xs text-[var(--danger)] font-mono mt-1" role="alert">
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Descripción opcional */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="description" className="block text-xs font-mono text-[var(--muted)]">
                    DESCRIPCIÓN MANUAL
                  </label>
                  {watchedDescription && (
                    <span className="text-[10px] font-mono text-[var(--muted)]">
                      {watchedDescription.length}/1000
                    </span>
                  )}
                </div>
                <textarea
                  {...register('description', linkFormRules.description)}
                  id="description"
                  rows={2}
                  className="input py-2.5 text-xs resize-none"
                  placeholder="Descripción del enlace (opcional)"
                />
                {errors.description && (
                  <p className="text-xs text-[var(--danger)] font-mono mt-1" role="alert">
                    {errors.description.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Menú de etiquetas (siempre visible para etiquetado ágil) */}
          <div>
            <ExistingTagsMenu
              availableTags={tags}
              selectedTags={selectedTags}
              onChange={setSelectedTags}
              label="Etiquetas del enlace"
              helperText="Agrega etiquetas existentes para indexar tu enlace inmediatamente."
            />
          </div>
        </div>

        {/* Botones de acción del formulario */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="btn-outline w-full sm:w-auto sm:px-6 h-[48px] min-h-[48px] order-2 sm:order-1 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !watchedUrl}
            className="btn-primary flex-1 w-full h-[50px] min-h-[50px] text-xs font-mono font-semibold tracking-wider flex items-center justify-center gap-2 order-1 sm:order-2 cursor-pointer shadow-sm hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                <span>ANALIZANDO Y GUARDANDO...</span>
              </>
            ) : (
              <>
                <span>GUARDAR ENLACE EN ARCHIVO</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>

        {/* Nota de privacidad editorial */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-[var(--muted)] pt-1 text-center">
          <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>
            <strong>PRIVATE BY DEFAULT</strong> · Guardado exclusivamente en tu colección personal
          </span>
        </div>
      </form>
    </div>
  )
}

export default LinkForm
