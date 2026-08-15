import axios from 'axios'
import { apiCache } from '../utils/apiCache'
import { supabase } from '../config/supabase'

// Configuración base de axios
const API_BASE_URL = import.meta.env.VITE_API_URL

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para agregar el token de autorización dinámico desde la sesión de Supabase + caché
api.interceptors.request.use(
  async (config) => {
    let token = null
    try {
      const { data } = await supabase.auth.getSession()
      token = data?.session?.access_token
    } catch (_) {}

    if (!token) {
      token = localStorage.getItem('auth-token')
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Solo cachear GET requests
    if (config.method === 'get') {
      const cacheKey = apiCache.generateKey(config.url, config.params)
      const cachedData = apiCache.get(cacheKey)
      
      if (cachedData) {
        // Devolver datos cacheados inmediatamente
        config.adapter = () => {
          return Promise.resolve({
            data: cachedData,
            status: 200,
            statusText: 'OK (from cache)',
            headers: config.headers,
            config,
            request: {},
            fromCache: true,
          })
        }
      }
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar respuestas y cachear
api.interceptors.response.use(
  (response) => {
    // Cachear GET responses exitosos
    if (response.config.method === 'get' && !response.fromCache) {
      const cacheKey = apiCache.generateKey(response.config.url, response.config.params)
      
      // TTL personalizado según endpoint
      let ttl = 5 * 60 * 1000 // 5 minutos default
      
      if (response.config.url.includes('/dashboard')) {
        ttl = 2 * 60 * 1000 // 2 minutos para dashboard
      } else if (response.config.url.includes('/links')) {
        ttl = 3 * 60 * 1000 // 3 minutos para links
      } else if (response.config.url.includes('/tags')) {
        ttl = 10 * 60 * 1000 // 10 minutos para tags
      }
      
      apiCache.set(cacheKey, response.data, ttl)
    }
    
    // Invalidar caché en mutaciones
    if (['post', 'put', 'patch', 'delete'].includes(response.config.method)) {
      const url = response.config.url
      
      if (url.includes('/links')) {
        apiCache.invalidate('/links')
        apiCache.invalidate('/dashboard')
      } else if (url.includes('/tags')) {
        apiCache.invalidate('/tags')
        apiCache.invalidate('/links')
      } else if (url.includes('/auth')) {
        apiCache.clear() // Limpiar todo en cambios de auth
      }
    }
    
    return response
  },
  (error) => {
    // Si el token ha expirado, limpiar el almacenamiento y redirigir
    // Evitar redirect automático para endpoints públicos de auth (login/register/refresh)
    const status = error.response?.status
    const reqUrl = error.config?.url || ''

    if (status === 401) {
      const isAuthEndpoint = reqUrl.includes('/auth/login') || reqUrl.includes('/auth/register') || reqUrl.includes('/auth/refresh') || reqUrl.includes('/auth/me')

      if (!isAuthEndpoint) {
        // Logout automático y redirección sólo para rutas protegidas
        localStorage.removeItem('auth-token')
        localStorage.removeItem('auth-storage')
        apiCache.clear() // Limpiar caché en logout
        try {
          supabase.auth.signOut()
        } catch (_) {}

        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

export default api

// Exponer funciones de caché para uso externo
export const clearAPICache = () => apiCache.clear()
export const invalidateAPICache = (pattern) => apiCache.invalidate(pattern)
export const getAPICacheStats = () => apiCache.getStats()
