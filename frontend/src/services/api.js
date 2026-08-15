import axios from 'axios'
import { supabase } from '../config/supabase'

const API_BASE_URL = import.meta.env.VITE_API_URL

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para inyectar token de autorización dinámico desde Supabase Session
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
    
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor para manejo global de 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const reqUrl = error.config?.url || ''

    if (status === 401) {
      const isAuthEndpoint = reqUrl.includes('/auth/login') || reqUrl.includes('/auth/register') || reqUrl.includes('/auth/refresh') || reqUrl.includes('/auth/me')

      if (!isAuthEndpoint) {
        localStorage.removeItem('auth-token')
        localStorage.removeItem('auth-storage')
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
