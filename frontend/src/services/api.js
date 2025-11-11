import axios from 'axios'

// Configuración base de axios
const API_BASE_URL = import.meta.env.VITE_API_URL

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para agregar el token de autorización
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
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

          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login'
          }
        }
      }

      return Promise.reject(error)
  }
)

export default api
