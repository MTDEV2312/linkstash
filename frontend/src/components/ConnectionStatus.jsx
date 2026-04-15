import React, { useReducer, useEffect } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { isOnline, addConnectionListeners } from '../utils/serviceWorker'

const initialState = {
  online: isOnline(),
  showStatus: false
}

const connectionReducer = (state, action) => {
  switch (action.type) {
    case 'ONLINE':
      return { online: true, showStatus: true }
    case 'OFFLINE':
      return { online: false, showStatus: true }
    case 'HIDE_STATUS':
      return { ...state, showStatus: false }
    default:
      return state
  }
}

const ConnectionStatus = () => {
  const [{ online, showStatus }, dispatch] = useReducer(connectionReducer, initialState)

  useEffect(() => {
    let timeoutId

    const handleOnline = () => {
      dispatch({ type: 'ONLINE' })
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => dispatch({ type: 'HIDE_STATUS' }), 3000)
    }

    const handleOffline = () => {
      dispatch({ type: 'OFFLINE' })
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => dispatch({ type: 'HIDE_STATUS' }), 3000)
    }

    const cleanup = addConnectionListeners(handleOnline, handleOffline)

    return () => {
      clearTimeout(timeoutId)
      cleanup()
    }
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