import { Link } from 'react-router-dom'
import { Bookmark, Tag, Search, Zap, Shield, Cloud, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import DarkModeToggle from '../components/DarkModeToggle'
import { useBackendWakeup } from '../hooks/useBackendWakeup'

const FEATURES = [
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

const BENEFITS = [
  'Metadata automática con scraping inteligente',
  'Sistema de favoritos y archivado',
  'Estadísticas y análisis de uso',
  'Interfaz moderna y responsive',
  'Dark mode para mayor comodidad',
  'Sin publicidad ni rastreadores'
]

const DEMO_LINKS = [
  { title: 'React Documentation', domain: 'react.dev', tags: ['React', 'Frontend'] },
  { title: 'TypeScript Handbook', domain: 'typescriptlang.org', tags: ['TypeScript', 'Learning'] },
  { title: 'Node.js Docs', domain: 'nodejs.org', tags: ['Node.js', 'Backend'] },
  { title: 'Tailwind CSS', domain: 'tailwindcss.com', tags: ['CSS', 'Tools'] }
]

const ServerWakeupModal = ({ isChecking, attempts }) => {
  if (!isChecking) return null

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-3">
          <Loader2 className="w-6 h-6 text-primary-600 dark:text-primary-400 animate-spin" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Iniciando servidor...</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
          El backend está despertando. Esto puede tomar unos segundos en el primer acceso.
        </p>
        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-primary-600 dark:bg-primary-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((attempts / 30) * 100, 95)}%` }}
            />
          </div>
          <span className="whitespace-nowrap">Intento {attempts}</span>
        </div>
      </div>
    </div>
  )
}

const ConnectionErrorBanner = ({ error }) => {
  if (!error) return null

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md mx-4">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-300 text-sm font-medium">{error}</p>
      </div>
    </div>
  )
}

const LandingNavbar = ({ isReady }) => {
  const disabledClass = !isReady ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''

  return (
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
              className={`text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-opacity ${disabledClass}`}
              aria-disabled={!isReady}
            >
              Iniciar sesión
            </Link>
            <Link to="/register" className={`btn-primary btn-md ${disabledClass}`} aria-disabled={!isReady}>
              Registrarse
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

const DemoCard = () => (
  <div className="mt-16 relative">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
      </div>
      <div className="p-8 bg-gray-50 dark:bg-gray-900">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Mis Enlaces</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">28 enlaces guardados</p>
          </div>
          <div className="flex space-x-2">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="w-10 h-10 bg-primary-600 rounded-lg"></div>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <div className="absolute left-3 top-3 text-gray-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Buscar enlaces..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              disabled
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEMO_LINKS.map((link) => (
            <div
              key={link.title}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{link.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{link.domain}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex-shrink-0"></div>
              </div>
              <div className="flex flex-wrap gap-1">
                {link.tags.map((tag) => (
                  <span
                    key={`${link.title}-${tag}`}
                    className="inline-block px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Y muchos más... Tu dashboard personal te espera</p>
        </div>
      </div>
    </div>
  </div>
)

const HeroSection = ({ isReady }) => {
  const disabledClass = !isReady ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''

  return (
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
          LinkStash es tu organizador personal de enlaces con extracción automática de metadata, etiquetado inteligente
          y búsqueda ultrarrápida. Todo en una interfaz moderna y fácil de usar.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className={`btn-primary btn-lg w-full sm:w-auto flex items-center justify-center ${disabledClass}`}
            aria-disabled={!isReady}
          >
            Comenzar gratis
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
          <Link to="/login" className={`btn-outline btn-lg w-full sm:w-auto ${disabledClass}`} aria-disabled={!isReady}>
            Iniciar sesión
          </Link>
        </div>
      </div>

      <DemoCard />
    </div>
  )
}

const FeaturesSection = () => (
  <div className="bg-white dark:bg-gray-900 py-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Características principales</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Todo lo que necesitas para gestionar tus enlaces de forma profesional
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.title}
              className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-200"
            >
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  </div>
)

const BenefitsSection = () => (
  <div className="bg-gradient-to-br from-primary-50 to-white dark:from-gray-800 dark:to-gray-900 py-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">¿Por qué elegir LinkStash?</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Una solución completa y moderna para organizar todos tus enlaces favoritos con funciones avanzadas y una
            experiencia de usuario excepcional.
          </p>

          <div className="space-y-4">
            {BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-start space-x-3">
                <CheckCircle2 className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-200">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Comienza hoy mismo</h3>
          <div className="space-y-4">
            <Link to="/register" className="btn-primary btn-lg w-full flex items-center justify-center">
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
)

const LandingFooter = () => (
  <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
            <Bookmark className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">LinkStash</span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">© 2025 LinkStash. Organiza tus enlaces de manera inteligente.</p>
      </div>
    </div>
  </footer>
)

const Landing = () => {
  const { isReady, isChecking, error, attempts } = useBackendWakeup()

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-primary-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <ServerWakeupModal isChecking={isChecking} attempts={attempts} />
      <ConnectionErrorBanner error={error} />
      <LandingNavbar isReady={isReady} />
      <HeroSection isReady={isReady} />
      <FeaturesSection />
      <BenefitsSection />
      <LandingFooter />
    </div>
  )
}

export default Landing
