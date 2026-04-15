import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

const AccountForm = ({ mode = 'profile' }) => {
  const { user, isLoading, updateProfile, changePassword } = useAuthStore()

  const [form, setForm] = useState({ username: '', email: '' })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

  useEffect(() => {
    if (mode === 'profile' && user) {
      setForm({ username: user.username || '', email: user.email || '' })
    }
  }, [mode, user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    if (serverError) setServerError(null)
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswords((p) => ({ ...p, [name]: value }))
    if (serverError) setServerError(null)
  }

  const submitProfile = async (e) => {
    e.preventDefault()
    if (!form.username?.trim() || !form.email?.trim()) {
      toast.error('El usuario y el email son obligatorios')
      return
    }

    setSubmitting(true)
    try {
      setServerError(null)
      const res = await updateProfile({ username: form.username.trim(), email: form.email.trim() })
      if (res && res.success) {
        toast.success('Perfil actualizado')
      } else {
        setServerError(res.message || 'Error al actualizar el perfil')
      }
    } catch (err) {
      setServerError('Error inesperado al actualizar el perfil')
    } finally {
      setSubmitting(false)
    }
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    if (!passwords.currentPassword || !passwords.newPassword) {
      toast.error('Rellena los campos de contraseña')
      return
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('La nueva contraseña y la confirmación no coinciden')
      return
    }

    setSubmitting(true)
    try {
      setServerError(null)
      const res = await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword })
      if (res && res.success) {
        toast.success('Contraseña actualizada')
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setServerError(res.message || 'Error al cambiar la contraseña')
      }
    } catch (err) {
      setServerError('Error inesperado al cambiar la contraseña')
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'profile') {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-medium  mb-4">Perfil</h3>
        <form onSubmit={submitProfile}>
          {serverError && <p className="mb-3 text-sm text-red-600">{serverError}</p>}
          <label htmlFor="profile-username" className="block mb-2 text-sm font-medium">Nombre de usuario</label>
          <input
            id="profile-username"
            name="username"
            value={form.username}
            onChange={handleChange}
            className="input mb-3"
            disabled={isLoading}
          />

          <label htmlFor="profile-email" className="block mb-2 text-sm font-medium">Email</label>
          <input
            id="profile-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="input mb-4"
            disabled={isLoading}
          />

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary btn-md"
              disabled={submitting || isLoading}
            >
              {submitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // mode === 'password'
  return (
    <div className="card p-6">
      <h3 className="text-lg font-medium  mb-4">Cambiar contraseña</h3>
      <form onSubmit={submitPassword}>
        <label htmlFor="current-password" className="block mb-2 text-sm font-medium">Contraseña actual</label>
        <input
          id="current-password"
          name="currentPassword"
          type="password"
          value={passwords.currentPassword}
          onChange={handlePasswordChange}
          className="input mb-3"
          disabled={isLoading}
        />

        <label htmlFor="new-password" className="block mb-2 text-sm font-medium">Nueva contraseña</label>
        <input
          id="new-password"
          name="newPassword"
          type="password"
          value={passwords.newPassword}
          onChange={handlePasswordChange}
          className="input mb-3"
          disabled={isLoading}
        />

        <label htmlFor="confirm-password" className="block mb-2 text-sm font-medium">Confirmar nueva contraseña</label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          value={passwords.confirmPassword}
          onChange={handlePasswordChange}
          className="input mb-4"
          disabled={isLoading}
        />

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary btn-md"
            disabled={submitting || isLoading}
          >
            {submitting ? 'Actualizando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AccountForm
