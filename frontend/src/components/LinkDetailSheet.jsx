import { useState, useEffect } from 'react'
import { 
  X, 
  ExternalLink, 
  Pencil, 
  Trash2, 
  RefreshCw, 
  Save, 
  Upload, 
  Image as ImageIcon,
  Calendar,
  Clock,
  Eye,
  Tag as TagIcon,
  Cloud
} from 'lucide-react'
import { useLinkStore } from '../stores/linkStore'
import OptimizedImage from './OptimizedImage'
import ExistingTagsMenu from './ExistingTagsMenu'
import ReScrapeModal from './ReScrapeModal'

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
  allTags = [],
  isOpen,
  onClose,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [showReScrapeModal, setShowReScrapeModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [currentLink, setCurrentLink] = useState(link)

  const { updateLink, deleteLink, incrementClickCount } = useLinkStore()

  const [form, setForm] = useState({
    title: '',
    url: '',
    description: '',
    tags: [],
    imageUrl: '',
    imagePreview: '',
    imageFileName: ''
  })

  // Synchronize current link when prop changes
  useEffect(() => {
    setCurrentLink(link)
    setIsEditing(false)
    setErrorMessage('')
    setImageFile(null)
    if (link) {
      setForm({
        title: link.title || '',
        url: link.url || '',
        description: link.description || '',
        tags: normalizeTagSelections(link.tags),
        imageUrl: link.image || '',
        imagePreview: link.image || '',
        imageFileName: ''
      })
    }
  }, [link])

  // Escape key closes sheet
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !showReScrapeModal) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showReScrapeModal, onClose])

  if (!isOpen || !currentLink) return null

  const resolveTagName = (tagItem) => {
    if (typeof tagItem === 'object' && tagItem !== null) {
      return tagItem.name || tagItem._id || 'Tag'
    }
    const fromCatalog = (allTags || []).find((tag) => tag._id === tagItem || tag.name === tagItem)
    return fromCatalog?.name || tagItem
  }

  const handleVisit = async () => {
    await incrementClickCount(currentLink._id)
    window.open(currentLink.url, '_blank', 'noopener,noreferrer')
  }

  const handleStartEdit = () => {
    setIsEditing(true)
    setErrorMessage('')
    setForm({
      title: currentLink.title || '',
      url: currentLink.url || '',
      description: currentLink.description || '',
      tags: normalizeTagSelections(currentLink.tags),
      imageUrl: currentLink.image || '',
      imagePreview: currentLink.image || '',
      imageFileName: ''
    })
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setImageFile(null)
    setErrorMessage('')
    setForm({
      title: currentLink.title || '',
      url: currentLink.url || '',
      description: currentLink.description || '',
      tags: normalizeTagSelections(currentLink.tags),
      imageUrl: currentLink.image || '',
      imagePreview: currentLink.image || '',
      imageFileName: ''
    })
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMessage('El archivo seleccionado no es una imagen válida.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('La imagen no puede superar los 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      setImageFile(file)
      setForm((prev) => ({
        ...prev,
        imageUrl: '',
        imagePreview: loadEvent.target?.result || '',
        imageFileName: file.name
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleRestoreImage = () => {
    setImageFile(null)
    setForm((prev) => ({
      ...prev,
      imageUrl: currentLink?.image || '',
      imagePreview: currentLink?.image || '',
      imageFileName: ''
    }))
  }

  const handleClearImage = () => {
    setImageFile(null)
    setForm((prev) => ({
      ...prev,
      imageUrl: '',
      imagePreview: '',
      imageFileName: ''
    }))
  }

  const handleSaveEdit = async () => {
    const normalized = normalizeUrl(form.url.trim())
    if (!isValidUrl(normalized)) {
      setErrorMessage('Ingresá una URL válida para guardar cambios.')
      return
    }

    const payload = {
      title: form.title.trim(),
      url: normalized,
      description: form.description.trim(),
      tags: form.tags || currentLink.tags || [],
      image: form.imageUrl?.trim() || ''
    }

    setIsSaving(true)
    setErrorMessage('')

    try {
      const result = imageFile
        ? await updateLink(currentLink._id, payload, imageFile, true)
        : await updateLink(currentLink._id, payload, null, Boolean(payload.image))

      if (!result?.success && result?.success !== undefined) {
        setErrorMessage(result?.message || 'No se pudo actualizar el enlace.')
        return
      }

      setIsEditing(false)
      setImageFile(null)
      setCurrentLink((prev) => ({ ...prev, ...payload }))
      onUpdate?.()
    } catch (err) {
      setErrorMessage(err.message || 'Error al actualizar el enlace.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este enlace? Esta acción no se puede deshacer.')) return

    try {
      await deleteLink(currentLink._id)
      onUpdate?.()
      onClose()
    } catch (err) {
      setErrorMessage(err.message || 'Error al eliminar el enlace.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-sheet-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar detalle del enlace"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <aside className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-[var(--surface)] border-l border-[var(--border-strong)] shadow-2xl flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md">
            <div>
              <span className="mono text-[9px] text-[var(--accent)] font-semibold uppercase tracking-wider block">
                INSPECTOR DE ENLACE
              </span>
              <h2 id="detail-sheet-title" className="text-base font-bold font-sans tracking-tight text-[var(--text)] truncate max-w-xs sm:max-w-md">
                {currentLink.title || 'Detalle del enlace'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 flex-1">
            {/* Hero Image */}
            <div className="relative aspect-video rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--surface-2)]">
              {currentLink.image ? (
                <OptimizedImage
                  src={currentLink.image}
                  alt={currentLink.title || 'Vista previa'}
                  width={600}
                  height={338}
                  className="w-full h-full object-cover"
                  isStored={currentLink.imageIsStored}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[var(--muted)] gap-2">
                  <ImageIcon className="w-8 h-8 opacity-40" />
                  <span className="mono text-[10px]">SIN IMAGEN ASIGNADA</span>
                </div>
              )}
              {currentLink.imageIsStored && (
                <span className="absolute bottom-2 left-2 mono text-[9px] bg-black/75 text-white px-2 py-0.5 rounded flex items-center gap-1 backdrop-blur-xs">
                  <Cloud className="w-3 h-3 text-[var(--accent)]" /> COPIA ALMACENADA
                </span>
              )}
            </div>

            {/* Error banner if present */}
            {errorMessage && (
              <div className="p-3 rounded border border-[var(--danger)]/50 bg-[var(--danger)]/10 text-[var(--danger)] text-xs">
                {errorMessage}
              </div>
            )}

            {isEditing ? (
              /* Inline Edit Mode */
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-title" className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block mb-1">
                    Título
                  </label>
                  <input
                    id="edit-title"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="input font-sans"
                    maxLength={200}
                    placeholder="Título del enlace"
                  />
                </div>

                <div>
                  <label htmlFor="edit-url" className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block mb-1">
                    URL destino
                  </label>
                  <input
                    id="edit-url"
                    value={form.url}
                    onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
                    className="input font-mono text-xs"
                    placeholder="https://ejemplo.com"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="edit-desc" className="mono text-[10px] text-[var(--muted)] uppercase font-semibold">
                      Descripción
                    </label>
                    <span className="mono text-[9px] text-[var(--muted)]">{form.description.length}/500</span>
                  </div>
                  <textarea
                    id="edit-desc"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="input min-h-[120px]"
                    maxLength={500}
                    placeholder="Descripción o notas del enlace..."
                  />
                </div>

                {/* Image Editor */}
                <div className="space-y-2">
                  <label className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block">
                    Imagen de portada
                  </label>
                  {form.imagePreview ? (
                    <div className="aspect-video w-full rounded border border-[var(--border)] overflow-hidden bg-[var(--surface-2)] mb-2">
                      <OptimizedImage
                        src={form.imagePreview}
                        alt="Vista previa editada"
                        width={400}
                        height={225}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null}

                  <label
                    htmlFor="edit-image-file"
                    className="flex items-center justify-center border border-dashed border-[var(--border-strong)] rounded p-3 hover:border-[var(--accent)] cursor-pointer transition-colors bg-[var(--surface-2)]/50"
                  >
                    <Upload className="w-4 h-4 mr-2 text-[var(--muted)]" />
                    <span className="text-xs text-[var(--muted)] font-mono truncate">
                      {form.imageFileName || 'Subir imagen desde equipo'}
                    </span>
                  </label>
                  <input
                    id="edit-image-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="relative">
                    <input
                      value={form.imageUrl}
                      onChange={(e) => {
                        const val = e.target.value
                        setImageFile(null)
                        setForm((prev) => ({
                          ...prev,
                          imageUrl: val,
                          imagePreview: val,
                          imageFileName: ''
                        }))
                      }}
                      className="input text-xs font-mono"
                      placeholder="O pegar URL directa de imagen..."
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={handleRestoreImage} className="btn-outline btn-sm">
                      Restaurar original
                    </button>
                    <button type="button" onClick={handleClearImage} className="btn-outline btn-sm text-[var(--danger)]">
                      Quitar imagen
                    </button>
                  </div>
                </div>

                {/* Tags Selector */}
                <div>
                  <ExistingTagsMenu
                    label="Etiquetas asignadas"
                    availableTags={allTags}
                    selectedTags={form.tags || []}
                    onChange={(nextTags) => setForm((prev) => ({ ...prev, tags: nextTags }))}
                    emptyText="No hay etiquetas registradas"
                    helperText="Selecciona del catálogo de etiquetas existentes."
                  />
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border)]">
                  <button type="button" onClick={handleCancelEdit} disabled={isSaving} className="btn-outline btn-md">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleSaveEdit} disabled={isSaving} className="btn-primary btn-md flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            ) : (
              /* Read-only Inspection Mode */
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-[var(--text)] leading-snug break-words">
                    {currentLink.title || 'Sin título registrado'}
                  </h3>
                  <a
                    href={currentLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-mono text-[var(--accent)] hover:underline break-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    {currentLink.url}
                  </a>
                </div>

                {/* Description */}
                <div>
                  <span className="mono text-[9px] text-[var(--muted)] uppercase font-semibold block mb-1">
                    Descripción
                  </span>
                  <p className="text-sm text-[var(--text)] leading-relaxed bg-[var(--surface-2)] p-3.5 rounded border border-[var(--border)]">
                    {currentLink.description || <span className="text-[var(--muted)] italic">Sin descripción</span>}
                  </p>
                </div>

                {/* Tag Pills */}
                {Array.isArray(currentLink.tags) && currentLink.tags.length > 0 && (
                  <div>
                    <span className="mono text-[9px] text-[var(--muted)] uppercase font-semibold block mb-2">
                      Etiquetas
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentLink.tags.map((tagItem, idx) => (
                        <span key={typeof tagItem === 'object' && tagItem !== null ? (tagItem._id || idx) : (tagItem || idx)} className="badge-secondary">
                          <TagIcon className="w-3 h-3 mr-1 text-[var(--accent)]" />
                          {resolveTagName(tagItem)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata Ledger */}
                <div className="border-t border-b border-[var(--border)] py-3 space-y-2 text-xs font-mono text-[var(--muted)]">
                  <div className="flex justify-between items-center">
                    <span>CREADO:</span>
                    <span className="text-[var(--text)] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[var(--muted)]" />
                      {formatDateLong(currentLink.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>ÚLTIMA VISITA:</span>
                    <span className="text-[var(--text)] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
                      {formatDateLong(currentLink.lastVisited)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>VISITAS TOTALES:</span>
                    <span className="text-[var(--text)] flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-[var(--muted)]" />
                      {currentLink.clickCount || 0}
                    </span>
                  </div>
                </div>

                {/* Inspector Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button type="button" onClick={handleVisit} className="btn-primary btn-md flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Visitar enlace
                  </button>
                  <button type="button" onClick={handleStartEdit} className="btn-outline btn-md flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReScrapeModal(true)}
                    className="btn-outline btn-md flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Re-escanear
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="btn-danger btn-md flex items-center gap-1.5 ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Layered ReScrape Modal */}
      <ReScrapeModal
        link={currentLink}
        isOpen={showReScrapeModal}
        onClose={() => setShowReScrapeModal(false)}
        onUpdate={() => {
          onUpdate?.()
        }}
      />
    </div>
  )
}

export default LinkDetailSheet
