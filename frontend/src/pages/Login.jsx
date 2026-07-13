import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../stores/authStore'
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState(null)
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ mode: 'onChange' })

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const result = await login(data)
      if (result && result.success) {
        setServerError(null)
        navigate('/dashboard')
      } else {
        // Mostrar error devuelto por el store debajo del formulario
        const msg = result?.message || 'Error al iniciar sesión'
        setServerError(msg)
        try { toast.error(msg) } catch (_) { /* ignore toast errors */ }
      }
    } catch (err) {
      // Manejo defensivo: si login lanzara por alguna razón, mostrar mensaje
      const msg = err?.response?.data?.message || err?.message || 'Error al iniciar sesión'
      setServerError(msg)
      try { toast.error(msg) } catch (_) { /* ignore toast errors */ }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8 relative">
       {/* Botón volver a landing */}
       <Link
         to="/"
         className="absolute top-4 left-4 sm:top-6 sm:left-6 inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
         aria-label="Volver al inicio"
       >
         <ArrowLeft className="w-4 h-4" />
         <span className="hidden sm:inline">Inicio</span>
       </Link>

       <div className="container mx-auto max-w-md w-full space-y-6 sm:space-y-8">
         <div>
           <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
             <LogIn className="h-6 w-6 text-primary-600 dark:text-primary-300" />
           </div>
             <h2 data-testid="login-title" className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
             Inicio de Sesión
           </h2>
           {!navigator.onLine && (
             <p className="mt-2 text-center text-sm text-red-600" role="status">
               Sin conexión. Algunas funciones pueden no estar disponibles.
             </p>
           )}
             <p className="mt-2 text-center text-sm text-gray-700 dark:text-gray-200">
             O{' '}
             <Link
               to="/register"
               data-testid="to-register-link"
               className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
             >
               ¿No tienes cuenta?
             </Link>
           </p>
         </div>
        
         <form className="mt-6 sm:mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Correo electrónico
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                   {...register('email', {
                     required: 'Este campo es requerido',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido'
                    },
                    onChange: () => serverError && setServerError(null)
                  })}
                  type="email"
                  required
                  aria-label="Correo electrónico"
                  className="input pl-10"
                  placeholder="tu@ejemplo.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                 <input
                    {...register('password', {
                     required: 'La contraseña es requerida',
                     minLength: {
                       value: 6,
                       message: 'La contraseña debe tener al menos 6 caracteres'
                     },
                     onChange: () => serverError && setServerError(null)
                   })}
                   type={showPassword ? 'text' : 'password'}
                   required
                   aria-label="Contraseña"
                   data-testid="password-input"
                   className="input pl-10 pr-10"
                   placeholder="••••••••"
                 />
                 <button
                    type="button"
                    aria-label="Mostrar u ocultar contraseña"
                    data-testid="password-toggle"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center z-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
                  </div>
                  {/* Hidden compatibility input appears only when visible */}
                  {showPassword && (
                    <input type="password" aria-hidden="true" tabIndex={-1} className="sr-only" />
                  )}
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>
          </div>

          <div>
            {serverError && (
              <p className="mt-2 text-sm text-red-600">{serverError}</p>
            )}
             <button
              type="submit"
              disabled={isLoading}
              data-testid="login-submit"
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Iniciando sesión...
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login
