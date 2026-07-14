import { useReducer, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useLinkStore } from '../stores/linkStore'
import useTagStore from '../stores/tagStore'
import PlaceholderImage from './PlaceholderImage'
import OptimizedImage from './OptimizedImage'
import ExistingTagsMenu from './ExistingTagsMenu'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { X, Link as LinkIcon, FileText, Image, Upload, Cloud, ExternalLink, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

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

const modalInitialState = {
  isSubmitting: false,
  serverError: null,
  imageFile: null,
  imageState: { url: '', preview: '' },
  selectedTags: []
}

const modalReducer = (state, action) => {
  switch (action.type) {
    case 'INIT_FROM_LINK':
      return {
        ...state,
        serverError: null,
        imageFile: null,
        selectedTags: action.payload.selectedTags,
        imageState: action.payload.imageState
      }
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload }
    case 'SET_SERVER_ERROR':
      return { ...state, serverError: action.payload }
    case 'SET_SELECTED_TAGS':
      return { ...state, selectedTags: action.payload }
    case 'SET_IMAGE_FROM_FILE':
      return { ...state, imageFile: action.payload.file, imageState: { url: '', preview: action.payload.preview } }
    case 'SET_IMAGE_FROM_URL':
      return { ...state, imageFile: null, imageState: { url: action.payload, preview: action.payload } }
    case 'CLEAR_IMAGE':
      return { ...state, imageFile: null, imageState: { url: '', preview: '' } }
    case 'RESTORE_IMAGE':
      return { ...state, imageFile: null, imageState: action.payload }
    default:
      return state
  }
}

const ImageEditor = ({
  link,
  imageState,
  imageFile,
  onFileChange,
  onUrlChange,
  onClear,
  onRestore
}) => (
  <div>
    <label htmlFor="edit-image-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      Imagen del enlace
    </label>

    <div className="mb-4">
      {imageState.preview ? (
        <div className="relative inline-block">
          <OptimizedImage
            src={imageState.preview}
            alt="Preview"
            width={300}
            height={300}
            className="w-40 h-40 object-cover rounded-lg border"
            quality={70}
            isStored={link?.imageIsStored && imageState.preview === link.image}
          />
          <button type="button" onClick={onClear} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
            <X className="w-3 h-3" />
          </button>
          {link?.imageIsStored && imageState.preview === link.image && (
            <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center">
              <Cloud className="w-3 h-3 mr-1" />
              Storage
            </span>
          )}
        </div>
      ) : (
        <PlaceholderImage />
      )}
    </div>

    <div className="space-y-4">
      <div>
        <label htmlFor="edit-image-file" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Subir nueva imagen
        </label>
        <div className="relative">
          <input
            id="edit-image-file"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.avif,.gif,.svg,.bmp,.tiff,.ico,image/*"
            onChange={onFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
            <div className="text-center">
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <span className="text-sm text-gray-600">{imageFile ? imageFile.name : 'Seleccionar imagen'}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Formatos soportados: JPG, PNG, WEBP, AVIF, GIF, SVG, BMP, TIFF, ICO (hasta 5MB).
      </p>

      <div>
        <label htmlFor="edit-image-url" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          O ingresar URL de imagen
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Image className="h-4 w-4 text-gray-400" />
          </div>
          <input
            id="edit-image-url"
            type="url"
            value={imageState.url}
            onChange={onUrlChange}
            className="input pl-10 text-sm"
            placeholder="https://ejemplo.com/imagen.jpg"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button type="button" onClick={onRestore} className="btn-outline btn-sm" disabled={!link?.image}>
          Restaurar original
        </button>
        <button type="button" onClick={onClear} className="btn-outline btn-sm text-red-600 hover:bg-red-50">
          Quitar imagen
        </button>
      </div>
    </div>
  </div>
)

const EditLinkModal = ({ link, isOpen, onClose, onUpdate }) => {
  const modalRef = useFocusTrap(isOpen)
  const [state, dispatch] = useReducer(modalReducer, modalInitialState)
  const { isSubmitting, serverError, imageFile, imageState, selectedTags } = state

  const { updateLink, refetchLinks } = useLinkStore()
  const { tags, fetchTags, refetchTags, markTagsForRefresh } = useTagStore()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      url: '',
      title: '',
      description: ''
    }
  })

  useEffect(() => {
    if (!tags || tags.length === 0) fetchTags()
  }, [tags, fetchTags])

  useEffect(() => {
    if (!link || !isOpen) return

    reset({
      url: link.url || '',
      title: link.title || '',
      description: link.description || ''
    })

    dispatch({
      type: 'INIT_FROM_LINK',
      payload: {
        selectedTags: Array.isArray(link.tags) ? link.tags : [],
        imageState: {
          url: link.image || '',
          preview: link.image || ''
        }
      }
    })
  }, [link, isOpen, reset])

  const watchedUrl = watch('url')
  const watchedDescription = watch('description') || ''

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede ser mayor a 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      dispatch({
        type: 'SET_IMAGE_FROM_FILE',
        payload: {
          file,
          preview: loadEvent.target?.result || ''
        }
      })
    }
    reader.readAsDataURL(file)
  }

  const handleImageUrlChange = (event) => {
    const value = event.target.value
    dispatch({ type: 'SET_IMAGE_FROM_URL', payload: value })
  }

  const clearImage = () => {
    dispatch({ type: 'CLEAR_IMAGE' })
  }

  const restoreOriginalImage = () => {
    dispatch({
      type: 'RESTORE_IMAGE',
      payload: {
        url: link?.image || '',
        preview: link?.image || ''
      }
    })
  }

  const closeModal = () => {
    if (isSubmitting) return
    onClose()
  }

  const onSubmit = async (data) => {
    dispatch({ type: 'SET_SUBMITTING', payload: true })
    dispatch({ type: 'SET_SERVER_ERROR', payload: null })

    try {
      const nextUrl = normalizeUrl(data.url)
      if (!isValidUrl(nextUrl)) {
        toast.error('Por favor ingresa una URL válida')
        dispatch({ type: 'SET_SUBMITTING', payload: false })
        return
      }

      const payload = {
        url: nextUrl,
        title: data.title?.trim() || '',
        description: data.description?.trim() || '',
        tags: selectedTags
      }

      if (imageState.url && !imageFile) {
        payload.image = imageState.url
      }

      const result = imageFile
        ? await updateLink(link._id, payload, imageFile, true)
        : await updateLink(link._id, payload, null, Boolean(imageState.url))

      if (!result?.success) {
        throw new Error(result?.message || 'No fue posible actualizar el enlace')
      }

      toast.success('Enlace actualizado exitosamente')
      onUpdate?.()
      await refetchLinks()
      markTagsForRefresh()
      await refetchTags()
      onClose()
    } catch (error) {
      dispatch({ type: 'SET_SERVER_ERROR', payload: error?.message || 'Error inesperado al actualizar el enlace' })
      toast.error('Error inesperado al actualizar el enlace')
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false })
    }
  }

  if (!isOpen || !link) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <button type="button" aria-label="Cerrar modal de edición" className="absolute inset-0" onClick={closeModal} />

      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        tabIndex={0}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 id="edit-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">Editar enlace</h2>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 rounded"
            aria-label="Cerrar modal de edición"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {serverError && <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>}

          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL del enlace *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                {...register('url', {
                  required: 'La URL es obligatoria',
                  validate: (value) => isValidUrl(value) || 'Por favor ingresa una URL válida',
                  onChange: () => dispatch({ type: 'SET_SERVER_ERROR', payload: null })
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
            {errors.url && <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>}
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FileText className="h-4 w-4 text-gray-400" />
              </div>
              <input
                {...register('title', {
                  maxLength: { value: 200, message: 'El título no puede exceder 200 caracteres' },
                  onChange: () => dispatch({ type: 'SET_SERVER_ERROR', payload: null })
                })}
                type="text"
                className="input pl-10"
                placeholder="Título del enlace"
              />
            </div>
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
            <textarea
              {...register('description', {
                maxLength: { value: 500, message: 'La descripción no puede exceder 500 caracteres' },
                onChange: () => dispatch({ type: 'SET_SERVER_ERROR', payload: null })
              })}
              className="input resize-none min-h-[120px] max-h-[200px] overflow-y-auto"
              rows={5}
              placeholder="Describe brevemente el contenido de este enlace..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.description ? (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">Describe brevemente el contenido del enlace</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">{watchedDescription.length}/500</p>
            </div>
          </div>

          <ImageEditor
            link={link}
            imageState={imageState}
            imageFile={imageFile}
            onFileChange={handleImageFileChange}
            onUrlChange={handleImageUrlChange}
            onClear={clearImage}
            onRestore={restoreOriginalImage}
          />

          <div>
            <ExistingTagsMenu
              availableTags={tags}
              selectedTags={selectedTags}
              onChange={(nextTags) => dispatch({ type: 'SET_SELECTED_TAGS', payload: nextTags })}
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={closeModal} className="btn-outline btn-md" disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary btn-md flex items-center" disabled={isSubmitting}>
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
