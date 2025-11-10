import { useState, useRef, useEffect } from 'react'
import { X, FileText, Loader2 } from 'lucide-react'
import { useLinkStore } from '../stores/linkStore'
import toast from 'react-hot-toast'

const DescriptionModal = ({ link, isOpen, onClose, onUpdate }) => {
  const [description, setDescription] = useState(link?.description || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { updateLinkData } = useLinkStore()
  const textareaRef = useRef(null)

  // Función para auto-resize del textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const maxHeight = 150 // Altura máxima en pixels
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px'
    }
  }

  // Actualizar descripción cuando cambia el link
  useEffect(() => {
    if (link && isOpen) {
      setDescription(link.description || '')
      setTimeout(() => {
        adjustTextareaHeight()
      }, 0)
    }
  }, [link, isOpen])

  // Auto-resize cuando cambia el contenido
  useEffect(() => {
    adjustTextareaHeight()
  }, [description])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await updateLinkData(link._id, {
        title: link.title,
        description: description.trim(),
        tags: link.tags,
        url: link.url
      })

      if (result.success) {
        toast.success('Descripción actualizada')
        onUpdate?.()
        onClose()
      }
    } catch (error) {
      toast.error('Error al actualizar la descripción')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !link) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Agregar descripción
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">{link.title}</h4>
            <p className="text-sm text-gray-600 mb-3">{link.url}</p>
            
            {link.image && (
              <img
                src={link.image}
                alt=""
                className="w-full h-32 object-cover rounded-lg mb-3"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Descripción del enlace
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <FileText className="h-4 w-4 text-gray-400" />
              </div>
              <textarea
                id="description"
                ref={textareaRef}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  adjustTextareaHeight()
                }}
                className="input pl-10 resize-none min-h-[100px] max-h-[150px] overflow-y-auto transition-all duration-200"
                placeholder="Describe brevemente de qué trata este enlace..."
                maxLength={500}
                style={{
                  minHeight: '100px'
                }}
                onInput={adjustTextareaHeight}
                onFocus={adjustTextareaHeight}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {description.length}/500 caracteres
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
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
                'Guardar descripción'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DescriptionModal