import { supabase } from '../config/supabase'
import api from './api'

class AuthService {
  // Configurar token de autenticación
  setAuthToken(token) {
    if (token) {
      localStorage.setItem('auth-token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }

  // Remover token de autenticación
  removeAuthToken() {
    localStorage.removeItem('auth-token')
    localStorage.removeItem('auth-storage')
    delete api.defaults.headers.common['Authorization']
  }

  // Obtener la sesión activa de Supabase
  async getSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    } catch (error) {
      return null
    }
  }

  // Registrar usuario
  async register(userData) {
    const response = await api.post('/auth/register', userData)
    const token = response.data?.data?.token
    if (token) {
      this.setAuthToken(token)
      try {
        await supabase.auth.signInWithPassword({
          email: userData.email,
          password: userData.password
        })
      } catch (_) {}
    }
    return response
  }

  // Iniciar sesión
  async login(credentials) {
    let authError = null
    let supabaseSession = null

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })
      if (error) {
        authError = error
      } else {
        supabaseSession = data?.session
      }
    } catch (err) {
      authError = err
    }

    const response = await api.post('/auth/login', credentials)
    const token = response.data?.data?.token || supabaseSession?.access_token
    if (token) {
      this.setAuthToken(token)
    } else if (authError) {
      throw authError
    }
    return response
  }

  // Cerrar sesión
  async logout() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.auth.signOut({ scope: 'local' })
      }
    } catch (_) {}
    this.removeAuthToken()
  }

  // Obtener perfil del usuario desde backend MongoDB
  async getProfile() {
    const response = await api.get('/auth/me')
    return response
  }

  // Actualizar perfil
  async updateProfile(profileData) {
    const response = await api.put('/auth/profile', profileData)
    return response
  }

  // Cambiar contraseña
  async changePassword(passwordData) {
    const response = await api.put('/auth/change-password', passwordData)
    return response
  }

  // Verificar si hay un token o sesión válida
  async hasValidToken() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) return true
    } catch (_) {}
    return Boolean(localStorage.getItem('auth-token'))
  }
}

export const authService = new AuthService()
export default authService
