import { useEffect } from 'react'
import LinkForm from './LinkForm'

const LinkFormModal = ({ isOpen, onClose, onSave }) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-form-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="relative z-10 w-full max-w-xl bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg shadow-2xl p-5 sm:p-6 my-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <LinkForm onSave={onSave} onCancel={onClose} />
      </div>
    </div>
  )
}

export default LinkFormModal
