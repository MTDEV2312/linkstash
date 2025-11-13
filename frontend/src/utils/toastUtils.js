import toast from 'react-hot-toast'

// Simple dedupe wrapper for toasts: evita mostrar el mismo mensaje+tipo varias veces
const shown = new Map()
const TTL = 4000 // ms por defecto

function _makeKey(type, message) {
  return `${type}::${message}`
}

export function showToast(type, message, opts = {}) {
  if (!message) return
  const key = _makeKey(type, message)
  const now = Date.now()
  const prev = shown.get(key)
  if (prev && now - prev < (opts.ttl || TTL)) return
  shown.set(key, now)
  setTimeout(() => shown.delete(key), opts.ttl || TTL)

  switch (type) {
    case 'success':
      toast.success(message, opts.options || {})
      break
    case 'error':
      toast.error(message, opts.options || {})
      break
    case 'info':
      toast(message, opts.options || {})
      break
    default:
      toast(message, opts.options || {})
  }
}

export function showSuccess(message, opts = {}) {
  showToast('success', message, opts)
}

export function showError(message, opts = {}) {
  showToast('error', message, opts)
}

export default { showToast, showSuccess, showError }
