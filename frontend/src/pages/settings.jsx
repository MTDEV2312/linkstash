import React, { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import AccountForm from '../components/AccountForm'

const Settings = () => {
  const { user, token, checkAuth } = useAuthStore()

  useEffect(() => {
    if (!user && token) checkAuth()
  }, [user, token, checkAuth])

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-4">Ajustes</h2>
        <p className="text-gray-600">Necesitas iniciar sesión para ver y editar tu configuración.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">Ajustes de la cuenta</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AccountForm mode="profile" />
        <AccountForm mode="password" />
      </div>

      <p className="mt-6 text-sm text-gray-500">Nota: Los cambios se guardan mediante la API. Si hay algún error, se mostrará una notificación.</p>
    </div>
  )
}

export default Settings
