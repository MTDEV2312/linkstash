import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../stores/authStore'
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { isColdStartError, RENDER_COLD_START_MESSAGE } from '../utils/errorUtils'

const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState(null)
  const [isColdStart, setIsColdStart] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ mode: 'onChange' })

  const clearErrors = () => {
    if (serverError) setServerError(null)
    if (isColdStart) setIsColdStart(false)
  }

  const onSubmit = async (data) => {
    setServerError(null)
    setIsColdStart(false)
    try {
      const result = await login(data)
      if (result && result.success) {
        setServerError(null)
        setIsColdStart(false)
        navigate('/dashboard')
      } else {
        const cold = isColdStartError(result)
        setIsColdStart(cold)
        const msg = cold ? RENDER_COLD_START_MESSAGE : (result?.message || 'Error al iniciar sesión')
        setServerError(msg)
        try { toast.error(msg) } catch (_) { /* ignore toast errors */ }
      }
    } catch (err) {
      const cold = isColdStartError(err)
      setIsColdStart(cold)
      const msg = cold ? RENDER_COLD_START_MESSAGE : (err?.response?.data?.message || err?.message || 'Error al iniciar sesión')
      setServerError(msg)
      try { toast.error(msg) } catch (_) { /* ignore toast errors */ }
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
            RETURN TO YOUR<br />ARCHIVE.
          </h1>
          <p className="text-[var(--muted)] text-base leading-relaxed">
            The parts of the Internet worth returning to, preserved with their context, metadata, and tags intact.
          </p>
        </div>

        <div className="relative z-10 flex gap-4 pt-6 border-t border-[var(--border)]">
          <div className="p-3.5 bg-[var(--surface-2)] border border-[var(--border)] rounded text-xs max-w-[210px]">
            <span className="mono text-[var(--accent)] block text-[10px] mb-1">RECENTLY KEPT</span>
            <strong className="block text-[var(--text)] truncate font-medium">Local-first software</strong>
            <span className="text-[var(--muted)] text-[11px] font-mono">inkandswitch.com</span>
          </div>
          <div className="p-3.5 bg-[var(--surface-2)] border border-[var(--border)] rounded text-xs max-w-[210px]">
            <span className="mono text-[var(--accent)] block text-[10px] mb-1">INDEX CATALOG</span>
            <strong className="block text-[var(--text)] font-medium">428 PIECES</strong>
            <span className="text-[var(--muted)] text-[11px] font-mono">AI · RESEARCH · SYSTEMS</span>
          </div>
        </div>
      </section>

      {/* Panel derecho: Formulario centrado y proporcionado */}
      <section className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 relative z-10">
        <div className="w-full max-w-[420px] mx-auto space-y-6">
          <div className="space-y-2">
            <span className="mono text-[var(--accent)] font-semibold tracking-wider text-[11px]">
              MEMBER ACCESS
            </span>
            <h2
              data-testid="login-title"
              className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text)]"
            >
              Inicio de Sesión
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Continúa recopilando donde lo dejaste.
            </p>

            {!navigator.onLine && (
              <p className="mt-2 text-sm text-[var(--danger)] font-mono" role="status">
                Sin conexión. Algunas funciones pueden no estar disponibles.
              </p>
            )}
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
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
                    required: 'La contraseña es requerida',
                    minLength: {
                      value: 6,
                      message: 'La contraseña debe tener al menos 6 caracteres'
                    },
                    onChange: clearErrors
                  })}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  aria-label="Contraseña"
                  data-testid="password-input"
                  className="input input-has-left-icon input-has-right-icon"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label="Mostrar u ocultar contraseña"
                  data-testid="password-toggle"
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
              {/* Hidden compatibility input for accessibility / auto-fill */}
              {showPassword && (
                <input type="password" aria-hidden="true" tabIndex={-1} className="sr-only" />
              )}
              {errors.password && (
                <p className="text-xs text-[var(--danger)] font-mono mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Alertas de error o cold start */}
            {isColdStart && (
              <div
                role="alert"
                className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-500 flex items-start gap-2.5 font-mono"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mt-1 flex-shrink-0" />
                <span>{RENDER_COLD_START_MESSAGE}</span>
              </div>
            )}
            {serverError && !isColdStart && (
              <p className="text-xs text-[var(--danger)] font-mono">{serverError}</p>
            )}

            {/* Botón de envío proporcionado */}
            <button
              type="submit"
              disabled={isLoading}
              data-testid="login-submit"
              className="btn-primary w-full h-[50px] min-h-[50px] text-xs font-mono font-semibold tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                  <span>INICIANDO SESIÓN...</span>
                </div>
              ) : (
                <>
                  <span>INICIAR SESIÓN</span>
                  <LogIn className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Enlace para cambiar a registro */}
          <div className="pt-4 text-center border-t border-[var(--border)]">
            <p className="text-xs font-mono text-[var(--muted)]">
              ¿NO TIENES CUENTA?{' '}
              <Link
                to="/register"
                data-testid="to-register-link"
                className="font-semibold text-[var(--accent)] hover:underline ml-1"
              >
                REGÍSTRATE
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Login
