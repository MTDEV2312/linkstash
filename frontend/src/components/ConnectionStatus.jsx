import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { isOnline, addConnectionListeners } from '../utils/serviceWorker'

const ConnectionStatus = () => {
  const [online, setOnline] = useState(isOnline())
  const [showStatus, setShowStatus] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      setShowStatus(true)
      setTimeout(() => setShowStatus(false), 3000)
    }

    const handleOffline = () => {
      setOnline(false)
      setShowStatus(true)
      setTimeout(() => setShowStatus(false), 3000)
    }

    const cleanup = addConnectionListeners(handleOnline, handleOffline)

    return cleanup
  }, [])

  if (!showStatus) return null

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
      online 
        ? 'bg-green-500 text-white' 
        : 'bg-red-500 text-white'
    }`}>
      {online ? (
        <>
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">Conectado</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Sin conexión</span>
        </>
      )}
    </div>
  )
}

export default ConnectionStatus