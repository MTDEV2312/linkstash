import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useLinkStore } from '../stores/linkStore'
import PlaceholderImage from './PlaceholderImage'
import { X, Link as LinkIcon, FileText, Tag, Loader2, Image, Upload, Cloud, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const EditLinkModal = ({ link, isOpen, onClose, onUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imageUrl, setImageUrl] = useState(link?.image || '')
  const [uploadToCloudinary, setUploadToCloudinary] = useState(true)
  const [imagePreview, setImagePreview] = useState(link?.image || '')
  const { updateLink } = useLinkStore()
  const textareaRef = useRef(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      url: '',
      title: '',
      description: '',
      tags: ''
    }
  })

  // Función para auto-resize del textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const maxHeight = 200 // Altura máxima en pixels
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px'
    }
  }

  // Resetear formulario cuando cambia el link
  useEffect(() => {
    if (link && isOpen) {
      const formData = {
        url: link.url || '',
        title: link.title || '',
        description: link.description || '',
        tags: (link.tags || []).join(', ')
      }
      
      // Resetear el formulario
      reset(formData)
      
      // También establecer el valor de descripción explícitamente
      setValue('description', link.description || '', { shouldDirty: false, shouldTouch: false })
      
      // Configurar imágenes
      setImageUrl(link.image || '')
      setImagePreview(link.image || '')
      setImageFile(null)
      
      // Ajustar altura del textarea después de establecer los valores
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.value = link.description || ''
          adjustTextareaHeight()
        }
      }, 100)
    }
  }, [link, isOpen, reset, setValue])

  // Observar cambios en la descripción para auto-resize
  const watchedDescription = watch('description')
  useEffect(() => {
    // Solo ajustar altura, no modificar el valor (react-hook-form ya lo maneja)
    if (textareaRef.current && watchedDescription !== undefined) {
      setTimeout(() => {
        adjustTextareaHeight()
      }, 0)
    }
  }, [watchedDescription])

  // Ajustar altura al abrir el modal y asegurar que el valor esté visible
  useEffect(() => {
    if (isOpen && link && textareaRef.current) {
      setTimeout(() => {
        // Forzar el valor en el textarea si no está visible
        if (textareaRef.current.value !== (link.description || '')) {
          textareaRef.current.value = link.description || ''
        }
        adjustTextareaHeight()
      }, 400) // Más tiempo para asegurar que todo esté listo
    }
  }, [isOpen, link])

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

  // Restaurar imagen original
  const restoreOriginalImage = () => {
    setImageFile(null)
    setImageUrl(link?.image || '')
    setImagePreview(link?.image || '')
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

      // Actualizar enlace
      let result
      if (imageFile) {
        // Actualizar con archivo de imagen
        result = await updateLink(link._id, linkData, imageFile, uploadToCloudinary)
      } else {
        // Actualizar solo datos (incluye URL de imagen si existe)
        result = await updateLink(link._id, linkData, null, uploadToCloudinary && imageUrl)
      }

      if (result.success) {
        toast.success('Enlace actualizado exitosamente')
        onUpdate?.()
        onClose()
      }
    } catch (error) {
      console.error('Error al actualizar enlace:', error)
      toast.error('Error inesperado al actualizar el enlace')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      // Reset form when closing
      setTimeout(() => {
        reset()
        setImageFile(null)
        setImageUrl('')
        setImagePreview('')
      }, 200)
    }
  }

  if (!isOpen || !link) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Editar enlace
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
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
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <a
                  href={watchedUrl && isValidUrl(watchedUrl) ? normalizeUrl(watchedUrl) : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-gray-400 hover:text-primary-600 ${!watchedUrl || !isValidUrl(watchedUrl) ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            {errors.url && (
              <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
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
                placeholder="Título del enlace"
              />
            </div>
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
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
              ref={(e) => {
                textareaRef.current = e
                return e
              }}
              value={watch('description') || ''}
              onChange={(e) => {
                setValue('description', e.target.value, { shouldDirty: true, shouldTouch: true })
                adjustTextareaHeight()
              }}
              className="input resize-none min-h-[120px] max-h-[200px] overflow-y-auto transition-all duration-200"
              placeholder="Describe brevemente el contenido de este enlace..."
              style={{
                minHeight: '120px'
              }}
              onInput={adjustTextareaHeight}
              onFocus={adjustTextareaHeight}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.description ? (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  Describe brevemente el contenido del enlace
                </p>
              )}
              <p className="text-xs text-gray-400">
                {watch('description')?.length || 0}/500
              </p>
            </div>
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagen del enlace
            </label>
            
            {/* Preview actual */}
            <div className="mb-4">
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-40 h-40 object-cover rounded-lg border"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {link?.imageIsCloudinary && imagePreview === link.image && (
                    <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center">
                      <Cloud className="w-3 h-3 mr-1" />
                      Cloudinary
                    </span>
                  )}
                </div>
              ) : (
                <PlaceholderImage />
              )}
            </div>

            {/* Controles de imagen */}
            <div className="space-y-4">
              {/* Subir archivo */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Subir nueva imagen
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-600">
                        {imageFile ? imageFile.name : 'Seleccionar imagen'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* URL de imagen */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  O ingresar URL de imagen
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Image className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={handleImageUrlChange}
                    className="input pl-10 text-sm"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                </div>
              </div>

              {/* Botones de acción para imagen */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={restoreOriginalImage}
                  className="btn-outline btn-sm"
                  disabled={!link?.image}
                >
                  Restaurar original
                </button>
                <button
                  type="button"
                  onClick={clearImage}
                  className="btn-outline btn-sm text-red-600 hover:bg-red-50"
                >
                  Quitar imagen
                </button>
              </div>

              {/* Opción de Cloudinary */}
              {(imageFile || imageUrl) && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="uploadToCloudinary"
                    checked={uploadToCloudinary}
                    onChange={(e) => setUploadToCloudinary(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="uploadToCloudinary" className="text-sm text-gray-700">
                    Subir a Cloudinary (recomendado para mejor rendimiento)
                  </label>
                </div>
              )}
            </div>
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
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
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
                  Actualizando...
                </>
              ) : (
                'Guardar cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditLinkModal