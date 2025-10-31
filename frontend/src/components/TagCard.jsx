import React from 'react'
import { Tag as TagIcon, Edit, Trash } from 'lucide-react'

// Helpers para contraste de texto según color de fondo
const hexToRgb = (hex) => {
  if (!hex) return null
  const cleaned = hex.replace('#', '')
  const full = cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned
  const bigint = parseInt(full, 16)
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }
}

const getContrastTextColor = (hex) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#000'
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    const srgb = v / 255
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
  })
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.179 ? '#000' : '#fff'
}

const TagCard = ({ tag, onEdit, onDelete }) => {
  return (
    <div className="flex items-center justify-between bg-white border rounded-md p-3 overflow-hidden">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: tag.color || '#F3F4F6' }}
        >
          {/* aplicar color contrastante al icono para accesibilidad */}
          <TagIcon className="w-4 h-4" style={{ color: getContrastTextColor(tag.color) }} />
        </div>

        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">{tag.name}</div>

          {tag.description && (
            <div
              className="text-xs text-gray-500"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {tag.description}
            </div>
          )}

          {tag.count !== undefined && (
            <div className="text-xs text-gray-500">{tag.count} enlaces</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit && onEdit(tag)}
          className="text-gray-500 hover:text-gray-700"
          title="Editar"
        >
          <Edit className="w-4 h-4" />
        </button>

        <button
          onClick={() => onDelete && onDelete(tag._id)}
          className="text-red-500 hover:text-red-700"
          title="Eliminar"
        >
          <Trash className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default TagCard
