import React from 'react'
import { Tag as TagIcon, Pencil, Trash2 } from 'lucide-react'

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
  const tagColor = tag.color || '#84CC16'
  const iconColor = getContrastTextColor(tagColor)

  return (
    <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded p-3.5 transition-colors group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 border border-black/10 shadow-xs"
          style={{ backgroundColor: tagColor }}
        >
          <TagIcon className="w-4 h-4" style={{ color: iconColor }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-sans font-bold text-sm text-[var(--text)] tracking-tight truncate">
              #{tag.name}
            </span>
            {tag.count !== undefined && (
              <span className="mono text-[9px] px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                {tag.count}
              </span>
            )}
          </div>

          {tag.description && (
            <p className="text-xs text-[var(--muted)] line-clamp-1 mt-0.5">
              {tag.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 pl-2">
        <button
          onClick={() => onEdit && onEdit(tag)}
          className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          title="Editar etiqueta"
          aria-label={`Editar etiqueta ${tag.name}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onDelete && onDelete(tag._id)}
          className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--danger)] transition-colors cursor-pointer"
          title="Eliminar etiqueta"
          aria-label={`Eliminar etiqueta ${tag.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default TagCard
