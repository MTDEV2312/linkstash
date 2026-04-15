import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../stores/authStore'
import { Mail, Lock, User, Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react'
import FormError from '../components/FormError'
import extractServerMessage from '../utils/errorUtils'

const Register = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register: registerUser, isLoading } = useAuthStore()
  const navigate = useNavigate()
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({ mode: 'onChange' })

  const password = watch('password')

  const onSubmit = async (data) => {
    const { confirmPassword, ...userData } = data
    setServerError(null)
    try {
      const result = await registerUser(userData)
      if (result.success) {
        navigate('/dashboard')
      } else {
        setServerError(result.message || 'Error al crear la cuenta')
      }
    } catch (err) {
      setServerError(extractServerMessage(err))
    }
  }

  const [serverError, setServerError] = useState(null)

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
            <UserPlus className="h-6 w-6 text-primary-600 dark:text-primary-300" />
          </div>
          <h2 data-testid="register-title" className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Crear Cuenta
          </h2>
             <p className="mt-2 text-center text-sm text-gray-700 dark:text-gray-200">
            O{' '}
            <Link
              to="/login"
              data-testid="to-login-link"
              className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
            >
              ¿Ya tienes cuenta?
            </Link>
          </p>
        </div>
        
         <form className="mt-6 sm:mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {serverError && <FormError message={serverError} />}
          <div className="space-y-4">
            <div>
               <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                 Nombre de usuario
               </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
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
                    }
          ,
            onChange: () => serverError && setServerError(null)
          })}
                  type="text"
                  className="input pl-10"
                  placeholder="mi_usuario"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            <div>
               <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                 Correo electrónico
               </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
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
                  <Lock className="h-5 w-5 text-gray-400" />
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
                      onChange: () => serverError && setServerError(null)
                    })}
                    type={showPassword ? 'text' : 'password'}
                    aria-label="Contraseña"
                    data-testid="register-password"
                    className="input pl-10 pr-10"
                    placeholder="••••••••"
                 />
                 <button
                   type="button"
                   aria-label="Mostrar u ocultar contraseña"
                   className="absolute inset-y-0 right-0 pr-3 flex items-center"
                   onClick={() => setShowPassword(!showPassword)}
                 >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {password && (
            <div>
               <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                 Confirmar contraseña
               </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                   <input
                    {...register('confirmPassword', {
                      required: 'Debes confirmar la contraseña',
                      validate: value =>
                        value === password || 'Las contraseñas no coinciden',
                      onChange: () => serverError && setServerError(null)
                    })}
                    type={showConfirmPassword ? 'text' : 'password'}
                    data-testid="register-confirm"
                    className="input pl-10 pr-10"
                    placeholder="••••••••"
                  />
                 <button
                  type="button"
                  aria-label="Mostrar u ocultar confirmación de contraseña"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center z-10"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
            )}
          </div>
 
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
               {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando cuenta...
                </div>
              ) : (
                'Registrarse'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Al crear una cuenta, aceptas nuestros{' '}
              <a href="/terms" className="text-primary-600 hover:text-primary-500">
                términos de servicio
              </a>{' '}
              y{' '}
              <a href="/privacy" className="text-primary-600 hover:text-primary-500">
                política de privacidad
              </a>
              .
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Register
