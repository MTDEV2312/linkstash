import { useBackendWakeup } from '../hooks/useBackendWakeup'

/**
 * Indicador sutil del estado de disponibilidad del backend.
 * Informa el estado de cold-start (Render free-tier) sin bloquear la navegación.
 */
const BackendStatusIndicator = ({
  isReady: propIsReady,
  isChecking: propIsChecking,
  error: propError,
  className = ''
}) => {
  const hookStatus = useBackendWakeup()

  const isReady = propIsReady !== undefined ? propIsReady : hookStatus.isReady
  const isChecking = propIsChecking !== undefined ? propIsChecking : hookStatus.isChecking
  const error = propError !== undefined ? propError : hookStatus.error

  let statusConfig = {
    label: 'Backend listo',
    tooltip: 'Backend listo',
    badgeText: 'Listo',
    dotClass: 'bg-emerald-500',
    pingClass: '',
    pulseClass: ''
  }

  if (isReady) {
    statusConfig = {
      label: 'Backend listo',
      tooltip: 'Backend listo',
      badgeText: 'Listo',
      dotClass: 'bg-emerald-500',
      pingClass: '',
      pulseClass: ''
    }
  } else if (isChecking) {
    statusConfig = {
      label: 'Iniciando servidor (Render free-tier). Puede demorar unos segundos.',
      tooltip: 'Iniciando servidor (Render free-tier). Puede demorar unos segundos.',
      badgeText: 'Iniciando...',
      dotClass: 'bg-amber-500',
      pingClass: 'bg-amber-400 animate-ping',
      pulseClass: 'animate-pulse'
    }
  } else {
    statusConfig = {
      label: 'Servidor no disponible',
      tooltip: 'Servidor no disponible',
      badgeText: 'Offline',
      dotClass: 'bg-red-500',
      pingClass: '',
      pulseClass: ''
    }
  }

  return (
    <div
      role="status"
      aria-label={statusConfig.label}
      title={statusConfig.tooltip}
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300 transition-colors select-none cursor-help ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {statusConfig.pingClass && (
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.pingClass}`} />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.dotClass} ${statusConfig.pulseClass}`}
        />
      </span>
      <span className="hidden sm:inline text-[11px] leading-none text-gray-500 dark:text-gray-400">
        {statusConfig.badgeText}
      </span>
    </div>
  )
}

export default BackendStatusIndicator
