import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import { User, Lock, Save, KeyRound } from 'lucide-react'

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
        toast.success('Perfil actualizado correctamente')
      } else {
        setServerError(res.message || 'Error al actualizar el perfil')
      }
    } catch {
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
        toast.success('Contraseña actualizada correctamente')
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setServerError(res.message || 'Error al cambiar la contraseña')
      }
    } catch {
      setServerError('Error inesperado al cambiar la contraseña')
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'profile') {
    return (
      <div className="card p-5 sm:p-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xs">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[var(--border)]">
          <div className="p-2 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent)]">
            <User className="w-4 h-4" />
          </div>
          <div>
            <span className="mono text-[9px] text-[var(--accent)] uppercase font-semibold block">
              IDENTIDAD
            </span>
            <h3 className="font-sans font-bold text-base text-[var(--text)] tracking-tight">
              Perfil de usuario
            </h3>
          </div>
        </div>

        <form onSubmit={submitProfile} className="space-y-4">
          {serverError && (
            <div className="p-3 rounded border border-[var(--danger)]/50 bg-[var(--danger)]/10 text-[var(--danger)] text-xs font-mono">
              {serverError}
            </div>
          )}

          <div>
            <label htmlFor="profile-username" className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block mb-1.5">
              Nombre de usuario
            </label>
            <input
              id="profile-username"
              name="username"
              value={form.username}
              onChange={handleChange}
              className="input font-mono text-xs"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label htmlFor="profile-email" className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block mb-1.5">
              Correo electrónico
            </label>
            <input
              id="profile-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="input font-mono text-xs"
              disabled={isLoading}
              required
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-[var(--border)]">
            <button
              type="submit"
              className="btn-primary btn-md flex items-center gap-1.5"
              disabled={submitting || isLoading}
            >
              <Save className="w-3.5 h-3.5" />
              {submitting ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // mode === 'password'
  return (
    <div className="card p-5 sm:p-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xs">
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[var(--border)]">
        <div className="p-2 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent)]">
          <KeyRound className="w-4 h-4" />
        </div>
        <div>
          <span className="mono text-[9px] text-[var(--accent)] uppercase font-semibold block">
            SEGURIDAD
          </span>
          <h3 className="font-sans font-bold text-base text-[var(--text)] tracking-tight">
            Cambiar contraseña
          </h3>
        </div>
      </div>

      <form onSubmit={submitPassword} className="space-y-4">
        {serverError && (
          <div className="p-3 rounded border border-[var(--danger)]/50 bg-[var(--danger)]/10 text-[var(--danger)] text-xs font-mono">
            {serverError}
          </div>
        )}

        <div>
          <label htmlFor="current-password" className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block mb-1.5">
            Contraseña actual
          </label>
          <input
            id="current-password"
            name="currentPassword"
            type="password"
            value={passwords.currentPassword}
            onChange={handlePasswordChange}
            className="input font-mono text-xs"
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="new-password" className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block mb-1.5">
            Nueva contraseña
          </label>
          <input
            id="new-password"
            name="newPassword"
            type="password"
            value={passwords.newPassword}
            onChange={handlePasswordChange}
            className="input font-mono text-xs"
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block mb-1.5">
            Confirmar nueva contraseña
          </label>
          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            value={passwords.confirmPassword}
            onChange={handlePasswordChange}
            className="input font-mono text-xs"
            disabled={isLoading}
            required
          />
        </div>

        <div className="flex justify-end pt-2 border-t border-[var(--border)]">
          <button
            type="submit"
            className="btn-primary btn-md flex items-center gap-1.5"
            disabled={submitting || isLoading}
          >
            <Lock className="w-3.5 h-3.5" />
            {submitting ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AccountForm
