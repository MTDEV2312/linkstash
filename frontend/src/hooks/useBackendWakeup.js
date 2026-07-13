import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

/**
 * Hook para verificar si el backend está listo antes de mostrar la aplicación
 * Hace pings periódicos hasta obtener respuesta exitosa
 * 
 * @returns {{ isReady: boolean, isChecking: boolean, error: string | null, attempts: number }}
 */
export const useBackendWakeup = () => {
  const [isReady, setIsReady] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState(null)
  const [attempts, setAttempts] = useState(0)
  
  // Usar URL del backend desde las variables de entorno o fallback a localhost
  const backendUrl = import.meta.env.VITE_BACK_URL
  
  const maxAttempts = 30 // Máximo 30 intentos (5 minutos aprox)
  const intervalRef = useRef(null)
  const attemptsRef = useRef(0)

  useEffect(() => {
    let isMounted = true

    const checkBackendHealth = async () => {
      // Evitar hacer más intentos si ya está listo o se alcanzó el máximo
      if (!isMounted || attemptsRef.current >= maxAttempts) {
        return
      }

      try {
        attemptsRef.current += 1
        setAttempts(attemptsRef.current)

        console.log(`⏳ Verificando backend (intento ${attemptsRef.current}/${maxAttempts})`)

        // Siempre usar URL completa del backend para evitar problemas con preview/producción
        const healthUrl = `${backendUrl}/health`
        
        // Intentar hacer ping al endpoint de salud o raíz del backend
        // NO usar headers personalizados para evitar preflight CORS
        const response = await axios.get(healthUrl, {
          timeout: 10000 // 10 segundos de timeout
        })
        
        if (response.status === 200 && isMounted) {
          console.log('✅ Backend está listo')
          setIsReady(true)
          setIsChecking(false)
          setError(null)
          
          // Limpiar intervalo
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      } catch (err) {
        // Si falla, continuar intentando
        console.log(`❌ Backend no responde (intento ${attemptsRef.current}/${maxAttempts})`, err.message)
        
        // Si llegamos al máximo de intentos, detener
        if (attemptsRef.current >= maxAttempts && isMounted) {
          setError('No se pudo conectar con el servidor. Por favor, intenta más tarde.')
          setIsChecking(false)
          
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      }
    }

    // Primer intento inmediato
    checkBackendHealth()

    // Configurar polling rápido (1.5s) en test/dev y estándar (10s) en prod
    const pingInterval = (import.meta.env.MODE === 'test' || import.meta.env.DEV) ? 1500 : 10000;

    intervalRef.current = setInterval(() => {
      if (attemptsRef.current < maxAttempts && !isReady) {
        checkBackendHealth()
      } else if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }, pingInterval)

    // Limpiar al desmontar
    return () => {
      isMounted = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [backendUrl]) // Solo depender de backendUrl, no de isReady ni attempts

  return { isReady, isChecking, error, attempts }
}
