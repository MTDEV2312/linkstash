import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../stores/authStore'
import { Mail, Lock, User, Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react'
import FormError from '../components/FormError'
import extractServerMessage, { isColdStartError, RENDER_COLD_START_MESSAGE } from '../utils/errorUtils'

const Register = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register: registerUser, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState(null)
  const [isColdStart, setIsColdStart] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({ mode: 'onChange' })

  const password = watch('password')

  const clearErrors = () => {
    if (serverError) setServerError(null)
    if (isColdStart) setIsColdStart(false)
  }

  const onSubmit = async (data) => {
    const { confirmPassword, ...userData } = data
    setServerError(null)
    setIsColdStart(false)
    try {
      const result = await registerUser(userData)
      if (result && result.success) {
        setServerError(null)
        setIsColdStart(false)
        navigate('/dashboard')
      } else {
        const cold = isColdStartError(result)
        setIsColdStart(cold)
        setServerError(cold ? RENDER_COLD_START_MESSAGE : (result?.message || 'Error al crear la cuenta'))
      }
    } catch (err) {
      const cold = isColdStartError(err)
      setIsColdStart(cold)
      setServerError(cold ? RENDER_COLD_START_MESSAGE : extractServerMessage(err))
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col lg:grid lg:grid-cols-[1.08fr_0.92fr] relative overflow-hidden font-sans">
      {/* Botón flotante volver a landing */}
      <Link
        to="/"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30 inline-flex items-center gap-2 text-xs font-mono text-[var(--muted)] hover:text-[var(--accent)] transition-colors px-3 py-1.5 rounded bg-[var(--surface)] border border-[var(--border)]"
        aria-label="Volver al inicio"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>INICIO</span>
      </Link>

      {/* Panel izquierdo: Identidad editorial Living Archive */}
      <section className="hidden lg:flex flex-col justify-between p-12 lg:p-16 bg-[var(--surface)] border-r border-[var(--border)] relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2.5">
            <span className="w-5 h-5 bg-[var(--accent)] rounded-sm flex items-center justify-center text-[var(--accent-text)] font-mono font-bold text-xs">
              L
            </span>
            <span className="font-mono text-xs font-semibold tracking-wider">LINKSTASH</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg my-auto py-12">
          <span className="mono text-[var(--accent)] font-semibold tracking-wider block mb-4">
            PRIVATE BY DEFAULT / YOUR COLLECTION
          </span>
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-[var(--text)] leading-tight mb-6">
            BUILD YOUR PERSONAL<br />WEB ARCHIVE.
          </h1>
          <p className="text-[var(--muted)] text-base leading-relaxed">
            Preserve articles, repositories, and media with persistent metadata stamps and full tag ownership.
          </p>
        </div>

        <div className="relative z-10 flex gap-4 pt-6 border-t border-[var(--border)]">
          <div className="p-3.5 bg-[var(--surface-2)] border border-[var(--border)] rounded text-xs max-w-[210px]">
            <span className="mono text-[var(--accent)] block text-[10px] mb-1">NO VENDOR LOCK-IN</span>
            <strong className="block text-[var(--text)] truncate font-medium">Export anytime</strong>
            <span className="text-[var(--muted)] text-[11px] font-mono">JSON / Markdown</span>
          </div>
          <div className="p-3.5 bg-[var(--surface-2)] border border-[var(--border)] rounded text-xs max-w-[210px]">
            <span className="mono text-[var(--accent)] block text-[10px] mb-1">AUTOMATIC ENRICHMENT</span>
            <strong className="block text-[var(--text)] font-medium">Metadata Scraper</strong>
            <span className="text-[var(--muted)] text-[11px] font-mono">OpenGraph · Diff Engine</span>
          </div>
        </div>
      </section>

      {/* Panel derecho: Formulario centrado y proporcionado */}
      <section className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 relative z-10 overflow-y-auto">
        <div className="w-full max-w-[420px] mx-auto space-y-6 my-auto">
          <div className="space-y-2">
            <span className="mono text-[var(--accent)] font-semibold tracking-wider text-[11px]">
              NEW ARCHIVE
            </span>
            <h2
              data-testid="register-title"
              className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text)]"
            >
              Crear Cuenta
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Comienza a preservar la web que te importa.
            </p>

            {!navigator.onLine && (
              <p className="mt-2 text-sm text-[var(--danger)] font-mono" role="status">
                Sin conexión. Algunas funciones pueden no estar disponibles.
              </p>
            )}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {/* Alertas de cold start o error del servidor */}
            {isColdStart && (
              <div
                role="alert"
                className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-500 flex items-start gap-2.5 font-mono"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mt-1 flex-shrink-0" />
                <span>{RENDER_COLD_START_MESSAGE}</span>
              </div>
            )}
            {serverError && !isColdStart && <FormError message={serverError} />}

            {/* Campo Nombre de Usuario */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-xs font-mono font-medium text-[var(--muted)] tracking-wider">
                NOMBRE DE USUARIO
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)] z-10">
                  <User className="h-5 w-5" />
                </div>
                <input
                  {...register('username', {
                    required: 'El nombre de usuario es obligatorio',
                    minLength: {
                      value: 3,
                      message: 'El nombre de usuario debe tener al menos 3 caracteres'
                    },
                    maxLength: {
                      value: 20,
                      message: 'El nombre de usuario no puede exceder 20 caracteres'
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9_-]+$/,
                      message: 'Solo se permiten letras, números, guiones y guiones bajos'
                    },
                    onChange: clearErrors
                  })}
                  id="username"
                  type="text"
                  aria-label="Nombre de usuario"
                  className="input input-has-left-icon"
                  placeholder="mi_usuario"
                />
              </div>
              {errors.username && (
                <p className="text-xs text-[var(--danger)] font-mono mt-1">{errors.username.message}</p>
              )}
            </div>

            {/* Campo Correo Electrónico */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-mono font-medium text-[var(--muted)] tracking-wider">
                CORREO ELECTRÓNICO
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)] z-10">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  {...register('email', {
                    required: 'Este campo es requerido',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido'
                    },
                    onChange: clearErrors
                  })}
                  id="email"
                  type="email"
                  required
                  aria-label="Correo electrónico"
                  className="input input-has-left-icon"
                  placeholder="tu@ejemplo.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-[var(--danger)] font-mono mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-mono font-medium text-[var(--muted)] tracking-wider">
                CONTRASEÑA
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)] z-10">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  {...register('password', {
                    required: 'Este campo es requerido',
                    minLength: {
                      value: 8,
                      message: 'La contraseña debe tener al menos 8 caracteres'
                    },
                    pattern: {
                      value: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                      message: 'La contraseña debe incluir letras y números'
                    },
                    onChange: clearErrors
                  })}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  aria-label="Contraseña"
                  data-testid="register-password"
                  className="input input-has-left-icon input-has-right-icon"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label="Mostrar u ocultar contraseña"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--muted)] hover:text-[var(--text)] transition-colors z-20 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-[var(--danger)] font-mono mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Campo Confirmar Contraseña */}
            {password && (
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="block text-xs font-mono font-medium text-[var(--muted)] tracking-wider">
                  CONFIRMAR CONTRASEÑA
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)] z-10">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    {...register('confirmPassword', {
                      required: 'Debes confirmar la contraseña',
                      validate: (value) =>
                        value === password || 'Las contraseñas no coinciden',
                      onChange: clearErrors
                    })}
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    aria-label="Confirmar contraseña"
                    data-testid="register-confirm"
                    className="input input-has-left-icon input-has-right-icon"
                    placeholder="Confirmar contraseña"
                  />
                  <button
                    type="button"
                    aria-label="Mostrar u ocultar confirmación de contraseña"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--muted)] hover:text-[var(--text)] transition-colors z-20 cursor-pointer"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-[var(--danger)] font-mono mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>
            )}

            {/* Botón de Registro */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                data-testid="register-submit"
                className="btn-primary w-full h-[50px] min-h-[50px] text-xs font-mono font-semibold tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                    <span>CREANDO CUENTA...</span>
                  </div>
                ) : (
                  <>
                    <span>REGISTRARSE</span>
                    <UserPlus className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-2">
              <p className="text-[11px] font-mono text-[var(--muted)] leading-relaxed">
                Al crear una cuenta, aceptas los{' '}
                <a href="/terms" className="text-[var(--accent)] hover:underline">
                  términos de servicio
                </a>{' '}
                y la{' '}
                <a href="/privacy" className="text-[var(--accent)] hover:underline">
                  política de privacidad
                </a>
                .
              </p>
            </div>
          </form>

          {/* Enlace para cambiar a login */}
          <div className="pt-4 text-center border-t border-[var(--border)]">
            <p className="text-xs font-mono text-[var(--muted)]">
              ¿YA TIENES CUENTA?{' '}
              <Link
                to="/login"
                data-testid="to-login-link"
                className="font-semibold text-[var(--accent)] hover:underline ml-1"
              >
                INICIA SESIÓN
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Register
