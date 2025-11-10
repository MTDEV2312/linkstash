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
    delete api.defaults.headers.common['Authorization']
  }

  // Registrar usuario
  async register(userData) {
    const response = await api.post('/auth/register', userData)
    return response
  }

  // Iniciar sesión
  async login(credentials) {
    const response = await api.post('/auth/login', credentials)
    return response
  }

  // Obtener perfil del usuario
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

  // Verificar si hay un token válido
  hasValidToken() {
    const token = localStorage.getItem('auth-token')
    if (!token) return false
    
    try {
      // Decodificar JWT para verificar expiración
      const payload = JSON.parse(atob(token.split('.')[1]))
      const now = Date.now() / 1000
      return payload.exp > now
    } catch (error) {
      return false
    }
  }
}

export default new AuthService()
