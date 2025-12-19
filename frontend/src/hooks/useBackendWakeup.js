import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

/**
 * Hook para despertar el backend de Render cuando está inactivo
 * Hace pings periódicos hasta obtener respuesta exitosa
 * 
 * @returns {{ isReady: boolean, isChecking: boolean, error: string | null }}
 */
export const useBackendWakeup = () => {
  const [isReady, setIsReady] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState(null)
  const [attempts, setAttempts] = useState(0)
  
  const backendUrl = import.meta.env.VITE_BACK_URL
  const maxAttempts = 30 // Máximo 30 intentos (5 minutos aprox)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!backendUrl) {
      setError('URL del backend no configurada')
      setIsChecking(false)
      return
    }

    const checkBackendHealth = async () => {
      try {
        // Intentar hacer ping al endpoint de salud o raíz del backend
        const response = await axios.get(`${backendUrl}/health`, {
          timeout: 10000, // 10 segundos de timeout
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        
        if (response.status === 200) {
          console.log('✅ Backend está listo')
          setIsReady(true)
          setIsChecking(false)
          setError(null)
          
          // Limpiar intervalo
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          
          return true
        }
      } catch (err) {
        // Si falla, continuar intentando
        console.log(`⏳ Backend no responde (intento ${attempts + 1}/${maxAttempts})`)
        setAttempts(prev => prev + 1)
        
        // Si llegamos al máximo de intentos, detener
        if (attempts >= maxAttempts) {
          setError('No se pudo conectar con el servidor. Por favor, intenta más tarde.')
          setIsChecking(false)
          
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
        
        return false
      }
    }

    // Primer intento inmediato
    checkBackendHealth()

    // Configurar polling cada 10 segundos
    intervalRef.current = setInterval(() => {
      if (!isReady && attempts < maxAttempts) {
        checkBackendHealth()
      }
    }, 10000) // 10 segundos entre intentos

    // Limpiar al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [backendUrl, isReady, attempts, maxAttempts])

  return { isReady, isChecking, error, attempts }
}
