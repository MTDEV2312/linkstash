import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import authService from '../services/authService'
import toast from 'react-hot-toast'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      // Acción para hacer login
      login: async (credentials) => {
        set({ isLoading: true })
        try {
          const response = await authService.login(credentials)
          const { token, user } = response.data
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          })
          
          // Configurar el token en el servicio
          authService.setAuthToken(token)
          
          toast.success(`¡Bienvenido, ${user.username}!`)
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Error al iniciar sesión'
          toast.error(message)
          return { success: false, message }
        }
      },

      // Acción para registrarse
      register: async (userData) => {
        set({ isLoading: true })
        try {
          const response = await authService.register(userData)
          const { token, user } = response.data
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          })
          
          // Configurar el token en el servicio
          authService.setAuthToken(token)
          
          toast.success('¡Cuenta creada exitosamente!')
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Error al crear la cuenta'
          toast.error(message)
          return { success: false, message }
        }
      },

      // Acción para hacer logout
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        })
        
        // Limpiar el token del servicio
        authService.removeAuthToken()
        toast.success('Sesión cerrada correctamente')
      },

      // Verificar autenticación al cargar la app
      checkAuth: async () => {
        const { token } = get()
        
        if (!token) {
          set({ isLoading: false })
          return
        }

        set({ isLoading: true })
        try {
          // Configurar el token en el servicio
          authService.setAuthToken(token)
          
          // Verificar si el token es válido
          const response = await authService.getProfile()
          const user = response.data.user
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          // Token inválido o expirado
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          })
          authService.removeAuthToken()
        }
      },

      // Actualizar perfil
      updateProfile: async (profileData) => {
        set({ isLoading: true })
        try {
          const response = await authService.updateProfile(profileData)
          const user = response.data.user
          
          set({
            user,
            isLoading: false
          })
          
          toast.success('Perfil actualizado correctamente')
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Error al actualizar el perfil'
          toast.error(message)
          return { success: false, message }
        }
      },

      // Cambiar contraseña
      changePassword: async (passwordData) => {
        set({ isLoading: true })
        try {
          await authService.changePassword(passwordData)
          
          set({ isLoading: false })
          toast.success('Contraseña actualizada correctamente')
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Error al cambiar la contraseña'
          toast.error(message)
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
