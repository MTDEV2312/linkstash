import { useState, useRef } from 'react'
import { Command, Plus, HelpCircle, Archive, Heart } from 'lucide-react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { KeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

const KeyboardHelpModal = ({ isOpen, onClose }) => {
  const modalRef = useFocusTrap(isOpen)

  const shortcuts = [
    {
      icon: Command,
      key: 'Cmd + K',
      action: 'Enfocar búsqueda',
      color: 'text-blue-600'
    },
    {
      icon: Plus,
      key: 'Cmd + N',
      action: 'Crear nuevo enlace',
      color: 'text-green-600'
    },
    {
      icon: HelpCircle,
      key: 'Cmd + /',
      action: 'Mostrar ayuda',
      color: 'text-purple-600'
    },
    {
      icon: Archive,
      key: 'Alt + A',
      action: 'Mostrar/ocultar archivados',
      color: 'text-orange-600'
    },
    {
      icon: Heart,
      key: 'Alt + F',
      action: 'Mostrar/ocultar favoritos',
      color: 'text-red-600'
    }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-auto"
        tabIndex={0}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <h2
            id="keyboard-help-title"
            className="text-2xl font-bold text-gray-900 flex items-center gap-2"
          >
            <HelpCircle className="w-6 h-6 text-primary-600" />
            Atajos de Teclado
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Usa estos atajos para navegar más rápido
          </p>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 space-y-4">
          {shortcuts.map((shortcut) => {
            const IconComponent = shortcut.icon
            return (
              <div
                key={`${shortcut.key}-${shortcut.action}`}
                className="flex items-start gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
              >
                <IconComponent
                  className={`w-5 h-5 mt-1 flex-shrink-0 ${shortcut.color}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {shortcut.action}
                  </div>
                  <kbd className="inline-block mt-1 px-2 py-1 text-xs font-mono font-semibold text-gray-800 bg-white border border-gray-300 rounded">
                    {shortcut.key}
                  </kbd>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tips */}
        <div className="border-t border-gray-200 p-6 bg-blue-50">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            💡 Consejos
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="flex-shrink-0">•</span>
              <span>
                Los atajos funcionan desde cualquier lugar en la aplicación
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0">•</span>
              <span>
                Si estás escribiendo en un campo, presiona <kbd className="px-1.5 py-0.5 text-xs font-mono bg-white border border-gray-300 rounded">Esc</kbd> primero
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0">•</span>
              <span>
                En Mac, usa <kbd className="px-1 text-xs font-mono">⌘</kbd> (Cmd). En Windows/Linux, usa <kbd className="px-1 text-xs font-mono">Ctrl</kbd>
              </span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end gap-2 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-200 focus-visible"
            aria-label="Cerrar ayuda de atajos"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

export default KeyboardHelpModal
