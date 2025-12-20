import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useLinkStore } from '../stores/linkStore'
import useTagStore from '../stores/tagStore'
import { X, Link as LinkIcon, FileText, Tag, Loader2, Image, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

const LinkForm = ({ onSave, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [urlPreview, setUrlPreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const [uploadToCloudinary, setUploadToCloudinary] = useState(true)
  const [imagePreview, setImagePreview] = useState('')
  const { saveLink, refetchLinks } = useLinkStore()
  const { refetchTags, markTagsForRefresh } = useTagStore()
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      url: '',
      title: '',
      description: '',
      tags: ''
    }
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

  // Manejar selección de archivo de imagen
  const handleImageFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona un archivo de imagen válido')
        return
      }

      // Validar tamaño (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no puede ser mayor a 5MB')
        return
      }

      setImageFile(file)
      
      // Crear preview
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
      
      // Limpiar URL si se selecciona archivo
      setImageUrl('')
    }
  }

  // Manejar cambio de URL de imagen
  const handleImageUrlChange = (e) => {
    const url = e.target.value
    setImageUrl(url)
    setImagePreview(url)
    
    // Limpiar archivo si se ingresa URL
    if (url) {
      setImageFile(null)
    }
  }

  // Limpiar imagen
  const clearImage = () => {
    setImageFile(null)
    setImageUrl('')
    setImagePreview('')
  }

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    
    try {
      // Preparar datos básicos
      const linkData = {
        url: normalizeUrl(data.url),
        title: data.title?.trim() || '',
        description: data.description?.trim() || '',
        tags: data.tags 
          ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
          : []
      }

      // Agregar imagen si hay URL
      if (imageUrl && !imageFile) {
        linkData.image = imageUrl
      }

      // Validar URL
      if (!isValidUrl(linkData.url)) {
        toast.error('Por favor ingresa una URL válida')
        return
      }

      // Guardar nuevo enlace - el backend maneja las imágenes automáticamente via scraping
      const result = await saveLink(linkData)

      if (result.success) {
        setServerError(null)
        await refetchLinks() // Asegura que la lista se actualice con el nuevo enlace
        markTagsForRefresh() // Marcar que tags necesitan refrescar por si hay nuevos
        await refetchTags() // Refrescar tags por si se crearon nuevos tags al guardar
        onSave?.(result.link)
      } else {
        setServerError(result.message || 'Error al guardar el enlace')
      }
    } catch (error) {
      // Mostrar mensaje inline y toast
      setServerError('Error inesperado al guardar el enlace')
      toast.error('Error inesperado al guardar el enlace')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {serverError && <div><p className="mt-2 text-sm text-red-600 dark:text-red-400">{serverError}</p></div>}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Agregar nuevo enlace
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* URL */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            URL del enlace *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LinkIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              {...register('url', {
                required: 'La URL es obligatoria',
                  validate: value => isValidUrl(value) || 'Por favor ingresa una URL válida',
                  onChange: () => serverError && setServerError(null)
              })}
              type="text"
              className="input pl-10"
              placeholder="https://ejemplo.com"
            />
          </div>
          {errors.url && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.url.message}</p>
          )}
          
          {/* Preview de URL */}
          {urlPreview && (
            <div className="mt-2 flex items-center text-xs text-gray-600 dark:text-gray-400">
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
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Título
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              {...register('title', {
                maxLength: {
                  value: 200,
                  message: 'El título no puede exceder 200 caracteres'
                }
                ,
                onChange: () => serverError && setServerError(null)
              })}
              type="text"
              className="input pl-10"
              placeholder="Título del enlace (se detectará automáticamente si se deja vacío)"
            />
          </div>
          {errors.title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Si no especificas un título, se extraerá automáticamente de la página web
          </p>
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Descripción
          </label>
          <textarea
            {...register('description', {
              maxLength: {
                value: 500,
                message: 'La descripción no puede exceder 500 caracteres'
              }
              ,
              onChange: () => serverError && setServerError(null)
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
                Guardando...
              </>
            ) : (
              'Guardar enlace'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default LinkForm
