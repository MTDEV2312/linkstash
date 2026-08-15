import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import authService from '../services/authService'
import { supabase } from '../config/supabase'
import { showSuccess, showError } from '../utils/toastUtils'
import { setUser as setSentryUser } from '../utils/sentry'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,

      // Acción para hacer login
      login: async (credentials) => {
        set({ isLoading: true })
        try {
          const response = await authService.login(credentials)
          const { token, user } = response.data.data
          const session = await authService.getSession()
          
          set({
            user,
            token,
            session,
            isAuthenticated: true,
            isLoading: false
          })
          
          authService.setAuthToken(token)
          setSentryUser(user)
          showSuccess(`¡Bienvenido, ${user.username}!`)
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error?.response?.data?.message || error?.message || 'Error al iniciar sesión'
          try {
            const status = error?.response?.status
            if (!status || status >= 500) {
              showError(message)
            }
          } catch (t) {}
          return { success: false, message }
        }
      },

      // Acción para registrarse
      register: async (userData) => {
        set({ isLoading: true })
        try {
          const response = await authService.register(userData)
          const { token, user } = response.data.data
          const session = await authService.getSession()
          
          set({
            user,
            token,
            session,
            isAuthenticated: true,
            isLoading: false
          })
          
          authService.setAuthToken(token)
          setSentryUser(user)
          showSuccess('¡Cuenta creada exitosamente!')
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error?.response?.data?.message || error?.message || 'Error al crear la cuenta'
          try {
            const status = error?.response?.status
            if (!status || status >= 500) {
              showError(message)
            }
          } catch (t) {}
          return { success: false, message }
        }
      },

      // Acción para hacer logout
      logout: async () => {
        await authService.logout()
        set({
          user: null,
          token: null,
          session: null,
          isAuthenticated: false,
          isLoading: false
        })
        setSentryUser(null)
        showSuccess('Sesión cerrada correctamente')
      },

      // Verificar autenticación al cargar la app y sincronizar sesión Supabase
      checkAuth: async () => {
        set({ isLoading: true })
        try {
          // 1. Obtener la sesión activa de Supabase
          const session = await authService.getSession()
          const token = session?.access_token || localStorage.getItem('auth-token')
          
          if (!token) {
            authService.removeAuthToken()
            set({ user: null, token: null, session: null, isAuthenticated: false, isLoading: false })
            return
          }

          authService.setAuthToken(token)
          
          // 2. Verificar si el token es válido obteniendo el perfil de MongoDB
          const response = await authService.getProfile()
          const user = response.data.data.user
          
          set({
            user,
            token,
            session,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          // Token/sesión inválida o expirada: limpiar almacenamiento silenciosamente
          authService.removeAuthToken()
          set({
            user: null,
            token: null,
            session: null,
            isAuthenticated: false,
            isLoading: false
          })
        }
      },

      // Suscribirse a los eventos de estado de auth de Supabase
      initAuthListener: () => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            set({ user: null, token: null, session: null, isAuthenticated: false })
            authService.removeAuthToken()
          } else if (event === 'TOKEN_REFRESHED' && session) {
            set({ token: session.access_token, session })
            authService.setAuthToken(session.access_token)
          } else if (event === 'SIGNED_IN' && session) {
            set({ token: session.access_token, session, isAuthenticated: true })
            authService.setAuthToken(session.access_token)
          }
        })
        return subscription
      },

      // Actualizar perfil
      updateProfile: async (profileData) => {
        set({ isLoading: true })
        try {
          const response = await authService.updateProfile(profileData)
          const user = response.data.data.user
          
          set({
            user,
            isLoading: false
          })
          
          showSuccess('Perfil actualizado correctamente')
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Error al actualizar el perfil'
          try {
            const status = error?.response?.status
            if (!status || status >= 500) {
              showError(message)
            }
          } catch (t) {}
          return { success: false, message }
        }
      },

      // Cambiar contraseña
      changePassword: async (passwordData) => {
        set({ isLoading: true })
        try {
          await authService.changePassword(passwordData)
          set({ isLoading: false })
          showSuccess('Contraseña actualizada correctamente')
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Error al cambiar la contraseña'
          try {
            const status = error?.response?.status
            if (!status || status >= 500) {
              showError(message)
            }
          } catch (t) {}
          return { success: false, message }
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
