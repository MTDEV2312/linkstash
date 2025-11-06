import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useLinkStore } from '../stores/linkStore'
import { X, Link as LinkIcon, FileText, Tag, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const LinkForm = ({ onSave, onCancel, editLink = null }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [urlPreview, setUrlPreview] = useState(null)
  const { saveLink, updateLink } = useLinkStore()
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: editLink ? {
      url: editLink.url,
      title: editLink.title,
      description: editLink.description,
      tags: editLink.tags.join(', ')
    } : {}
  })

  const watchedUrl = watch('url')

  // Función para validar URL
  const isValidUrl = (string) => {
    try {
      new URL(string.startsWith('http') ? string : `https://${string}`)
      return true
    } catch (_) {
      return false
    }
  }

  // Normalizar URL
  const normalizeUrl = (url) => {
    if (!url) return ''
    return url.startsWith('http') ? url : `https://${url}`
  }

  // Preview de URL cuando cambia
  useEffect(() => {
    if (watchedUrl && isValidUrl(watchedUrl)) {
      const normalizedUrl = normalizeUrl(watchedUrl)
      try {
        const urlObj = new URL(normalizedUrl)
        setUrlPreview({
          domain: urlObj.hostname,
          favicon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`,
          isSecure: normalizedUrl.startsWith('https://')
        })
      } catch (error) {
        setUrlPreview(null)
      }
    } else {
      setUrlPreview(null)
    }
  }, [watchedUrl])

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    
    try {
      // Preparar datos
      const linkData = {
        url: normalizeUrl(data.url),
        title: data.title?.trim() || '',
        description: data.description?.trim() || '',
        tags: data.tags 
          ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
          : []
      }

      // Validar URL
      if (!isValidUrl(linkData.url)) {
        toast.error('Por favor ingresa una URL válida')
        return
      }

      // Guardar o actualizar
      let result
      if (editLink) {
        result = await updateLink(editLink._id, linkData)
      } else {
        result = await saveLink(linkData)
      }

      if (result.success) {
        onSave?.(result.link)
      }
    } catch (error) {
      console.error('Error al guardar enlace:', error)
      toast.error('Error inesperado al guardar el enlace')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {editLink ? 'Editar enlace' : 'Agregar nuevo enlace'}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* URL */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            URL del enlace *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LinkIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              {...register('url', {
                required: 'La URL es obligatoria',
                validate: value => isValidUrl(value) || 'Por favor ingresa una URL válida'
              })}
              type="text"
              className="input pl-10"
              placeholder="https://ejemplo.com"
            />
          </div>
          {errors.url && (
            <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
          )}
          
          {/* Preview de URL */}
          {urlPreview && (
            <div className="mt-2 flex items-center text-xs text-gray-600">
              <img
                src={urlPreview.favicon}
                alt=""
                className="w-4 h-4 mr-2"
                onError={(e) => e.target.style.display = 'none'}
              />
              <span className="flex items-center">
                {urlPreview.isSecure ? (
                  <span className="text-green-600 mr-1">🔒</span>
                ) : (
                  <span className="text-yellow-600 mr-1">⚠️</span>
                )}
                {urlPreview.domain}
              </span>
            </div>
          )}
        </div>

        {/* Título */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Título
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-4 w-4 text-gray-400" />
            </div>
            <input
              {...register('title', {
                maxLength: {
                  value: 200,
                  message: 'El título no puede exceder 200 caracteres'
                }
              })}
              type="text"
              className="input pl-10"
              placeholder="Título del enlace (se detectará automáticamente si se deja vacío)"
            />
          </div>
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Si no especificas un título, se extraerá automáticamente de la página web
          </p>
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            {...register('description', {
              maxLength: {
                value: 500,
                message: 'La descripción no puede exceder 500 caracteres'
              }
            })}
            rows={3}
            className="input resize-none"
            placeholder="Descripción del enlace (opcional)"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Etiquetas */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
            Etiquetas
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Tag className="h-4 w-4 text-gray-400" />
            </div>
            <input
              {...register('tags')}
              type="text"
              className="input pl-10"
              placeholder="programación, tutorial, react (separadas por comas)"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Separa las etiquetas con comas. Se generarán automáticamente si se dejan vacías.
          </p>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-outline btn-md"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary btn-md flex items-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {editLink ? 'Actualizando...' : 'Guardando...'}
              </>
            ) : (
              editLink ? 'Actualizar enlace' : 'Guardar enlace'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default LinkForm
