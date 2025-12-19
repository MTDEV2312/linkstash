import { Link } from 'react-router-dom'
import { Bookmark, Tag, Search, Zap, Shield, Cloud, ArrowRight, CheckCircle2 } from 'lucide-react'
import DarkModeToggle from '../components/DarkModeToggle'

const Landing = () => {
  const features = [
    {
      icon: Bookmark,
      title: 'Organiza tus enlaces',
      description: 'Guarda y clasifica todos tus enlaces favoritos en un solo lugar con metadata automática.'
    },
    {
      icon: Tag,
      title: 'Etiquetado inteligente',
      description: 'Crea etiquetas personalizadas y organiza tus enlaces de forma visual y eficiente.'
    },
    {
      icon: Search,
      title: 'Búsqueda rápida',
      description: 'Encuentra cualquier enlace al instante con nuestro potente motor de búsqueda.'
    },
    {
      icon: Zap,
      title: 'Scraping automático',
      description: 'Extracción automática de títulos, descripciones e imágenes de tus enlaces.'
    },
    {
      icon: Shield,
      title: 'Privado y seguro',
      description: 'Tus datos están protegidos con encriptación y autenticación segura.'
    },
    {
      icon: Cloud,
      title: 'Acceso desde cualquier lugar',
      description: 'Sincronización en la nube para acceder a tus enlaces desde cualquier dispositivo.'
    }
  ]

  const benefits = [
    'Metadata automática con scraping inteligente',
    'Sistema de favoritos y archivado',
    'Estadísticas y análisis de uso',
    'Interfaz moderna y responsive',
    'Dark mode para mayor comodidad',
    'Sin publicidad ni rastreadores'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-primary-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      {/* Navbar */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <Bookmark className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">LinkStash</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <DarkModeToggle />
              <Link
                to="/login"
                className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/register"
                className="btn-primary btn-md"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6">
            Organiza tus enlaces
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">
              de manera inteligente
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-10">
            LinkStash es tu organizador personal de enlaces con extracción automática de metadata, 
            etiquetado inteligente y búsqueda ultrarrápida. Todo en una interfaz moderna y fácil de usar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="btn-primary btn-lg w-full sm:w-auto flex items-center justify-center"
            >
              Comenzar gratis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              to="/login"
              className="btn-outline btn-lg w-full sm:w-auto"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>

        {/* Screenshot/Demo placeholder */}
        <div className="mt-16 relative">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
            </div>
            <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <Bookmark className="w-24 h-24 text-primary-300 dark:text-primary-700 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Dashboard de ejemplo</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white dark:bg-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Características principales
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar tus enlaces de forma profesional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-200"
                >
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-br from-primary-50 to-white dark:from-gray-800 dark:to-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                ¿Por qué elegir LinkStash?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                Una solución completa y moderna para organizar todos tus enlaces favoritos 
                con funciones avanzadas y una experiencia de usuario excepcional.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle2 className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-200">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                Comienza hoy mismo
              </h3>
              <div className="space-y-4">
                <Link
                  to="/register"
                  className="btn-primary btn-lg w-full flex items-center justify-center"
                >
                  Crear cuenta gratis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Ya tienes cuenta?{' '}
                  <Link
                    to="/login"
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 font-medium"
                  >
                    Inicia sesión aquí
                  </Link>
                </p>
              </div>
              
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">100%</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Gratis</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">∞</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Enlaces</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">24/7</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Acceso</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <Bookmark className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">LinkStash</span>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2025 LinkStash. Organiza tus enlaces de manera inteligente.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
