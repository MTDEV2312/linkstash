import { Link } from 'react-router-dom'
import { Bookmark, Tag, Search, Zap, Shield, Cloud, ArrowRight, CheckCircle2 } from 'lucide-react'
import DarkModeToggle from '../components/DarkModeToggle'
import BackendStatusIndicator from '../components/BackendStatusIndicator'
import { useBackendWakeup } from '../hooks/useBackendWakeup'

const FEATURES = [
  {
    icon: Bookmark,
    title: 'Organiza tus enlaces',
    description: 'Guarda y clasifica todos tus enlaces favoritos en un solo lugar con metadata automática y visualización ledger.'
  },
  {
    icon: Tag,
    title: 'Etiquetado inteligente',
    description: 'Crea etiquetas personalizadas con códigos de color y organiza tus enlaces de forma visual y estructurada.'
  },
  {
    icon: Search,
    title: 'Búsqueda rápida',
    description: 'Encuentra cualquier enlace al instante con nuestro motor de búsqueda indexado y comando global ⌘K.'
  },
  {
    icon: Zap,
    title: 'Scraping automático',
    description: 'Extracción automática de títulos, descripciones e imágenes de portada directo desde el sitio remoto.'
  },
  {
    icon: Shield,
    title: 'Privado y seguro',
    description: 'Tus datos están protegidos con autenticación segura y almacenamiento aislado de tus colecciones.'
  },
  {
    icon: Cloud,
    title: 'Acceso desde cualquier lugar',
    description: 'Sincronización en la nube para acceder a tus recursos desde cualquier dispositivo móvil o de escritorio.'
  }
]

const BENEFITS = [
  'Metadata automática con scraping inteligente y diff merge',
  'Sistema de favoritos y archivo histórico de referencias',
  'Estadísticas de visita y frecuencias de consulta',
  'Diseño Living Archive con Space Grotesk e IBM Plex Mono',
  'Modo oscuro Dark Catalog y papel claro Paper Light',
  'Completamente libre de publicidad y sin rastreadores invasivos'
]

const DEMO_LINKS = [
  { title: 'React Documentation', domain: 'react.dev', tags: ['React', 'Frontend'], clicks: 124 },
  { title: 'TypeScript Handbook', domain: 'typescriptlang.org', tags: ['TypeScript', 'Learning'], clicks: 89 },
  { title: 'Tailwind CSS v4 System', domain: 'tailwindcss.com', tags: ['CSS', 'Design'], clicks: 56 },
  { title: 'Node.js Architecture', domain: 'nodejs.org', tags: ['Node.js', 'Backend'], clicks: 42 }
]

const ConnectionErrorBanner = ({ error }) => {
  if (!error) return null

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md mx-4 animate-fade-in">
      <div className="bg-[var(--danger)]/15 border border-[var(--danger)]/40 rounded p-4 text-xs font-mono text-[var(--danger)]">
        <p className="font-semibold">{error}</p>
      </div>
    </div>
  )
}

const LandingNavbar = ({ isReady, isChecking, error }) => {
  return (
    <nav className="bg-[var(--surface)]/85 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative w-6 h-6 flex items-center justify-center">
              <span className="absolute inset-0 bg-[var(--surface-2)] border border-[var(--accent)] rounded-[2px]" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-[var(--accent)]" />
              <Bookmark className="w-3.5 h-3.5 text-[var(--accent)] relative z-10" />
            </div>
            <span className="font-sans font-bold text-lg tracking-tight text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
              LinkStash
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <BackendStatusIndicator isReady={isReady} isChecking={isChecking} error={error} />
            <DarkModeToggle />
            <Link
              to="/login"
              className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors px-2 py-1"
            >
              Iniciar sesión
            </Link>
            <Link to="/register" className="btn-primary btn-sm sm:btn-md">
              Registrarse
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

const DemoCard = () => (
  <div className="mt-12 sm:mt-16 relative">
    <div className="card overflow-hidden shadow-2xl border-[var(--border-strong)] bg-[var(--surface)]">
      {/* Editorial Card Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
          <span className="mono text-[10px] text-[var(--muted)] uppercase font-semibold">
            CATÁLOGO VIVO // DEMO INTERACTIVA
          </span>
        </div>
        <span className="mono text-[10px] text-[var(--muted)]">4 ITEMS INDEXADOS</span>
      </div>

      <div className="p-6 bg-[var(--surface)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DEMO_LINKS.map((item, idx) => (
            <div
              key={item.title}
              className="p-4 rounded border border-[var(--border)] bg-[var(--surface-2)]/60 hover:border-[var(--accent)]/60 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="mono text-[10px] text-[var(--muted)] uppercase">
                  {item.domain}
                </span>
                <span className="mono text-[10px] text-[var(--muted)]">
                  {item.clicks} visitas
                </span>
              </div>
              <h4 className="font-sans font-bold text-sm text-[var(--text)] tracking-tight">
                {item.title}
              </h4>
              <div className="flex gap-1.5 mt-3">
                {item.tags.map((t) => (
                  <span key={t} className="badge-secondary text-[9px] font-mono">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)

const HeroSection = () => (
  <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    <div className="text-center max-w-3xl mx-auto">
      <span className="mono text-xs font-semibold text-[var(--accent)] uppercase tracking-wider block mb-3">
        LIVING ARCHIVE // SISTEMA DE REFERENCIAS WEB
      </span>
      <h1 className="font-sans font-bold text-4xl sm:text-6xl lg:text-7xl tracking-tighter text-[var(--text)] leading-[1.05]">
        Organiza tus enlaces con precisión editorial
      </h1>
      <p className="mt-6 text-base sm:text-lg text-[var(--muted)] leading-relaxed">
        Guarda, clasifica y redescubre tus recursos digitales en un catálogo tipográfico de alto contraste con Space Grotesk, IBM Plex Mono y scraping automático.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/register" className="btn-primary btn-lg">
          Comenzar gratis
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
        <Link to="/login" className="btn-outline btn-lg">
          Iniciar sesión
        </Link>
      </div>

      <div className="mt-8 flex items-center justify-center gap-6 mono text-[11px] text-[var(--muted)]">
        <span className="flex items-center gap-1.5">
          <span className="signal-dot" /> Sin tarjeta requerida
        </span>
        <span className="flex items-center gap-1.5">
          <span className="signal-dot" /> 100% Gratuito
        </span>
        <span className="flex items-center gap-1.5">
          <span className="signal-dot" /> Open Access
        </span>
      </div>
    </div>

    <DemoCard />
  </section>
)

const FeaturesSection = () => (
  <section className="py-16 border-t border-[var(--border)] bg-[var(--surface)]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mb-12">
        <span className="mono text-[10px] text-[var(--accent)] font-semibold uppercase tracking-wider block mb-1">
          CAPACIDADES DEL SISTEMA
        </span>
        <h2 className="font-sans font-bold text-2xl sm:text-3xl text-[var(--text)] tracking-tight">
          Características principales
        </h2>
        <p className="text-xs sm:text-sm text-[var(--muted)] mt-2">
          Herramientas diseñadas para mantener tu colección de enlaces limpia, accesible y viva en todo momento.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((feature, idx) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.title}
              className="card p-6 border-[var(--border)] bg-[var(--surface-2)]/40 hover:border-[var(--border-strong)] transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[var(--accent)]">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="mono text-[10px] text-[var(--muted)]">0{idx + 1}</span>
              </div>
              <h3 className="font-sans font-bold text-base text-[var(--text)] tracking-tight">
                {feature.title}
              </h3>
              <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
                {feature.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  </section>
)

const BenefitsSection = () => (
  <section className="py-16 sm:py-24 border-t border-[var(--border)] bg-[var(--bg)]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="mono text-[10px] text-[var(--accent)] font-semibold uppercase tracking-wider block mb-1">
            EDITORIAL MANIFESTO
          </span>
          <h2 className="font-sans font-bold text-2xl sm:text-4xl text-[var(--text)] tracking-tight">
            ¿Por qué elegir LinkStash?
          </h2>
          <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">
            A diferencia de los marcadores tradicionales sobrecargados de distracciones, LinkStash trata tus enlaces como un catálogo vivo con tipografía refinada, atajos de teclado y sincronización instantánea.
          </p>

          <div className="mt-8 space-y-3">
            {BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-[var(--text)] font-sans">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link to="/register" className="btn-primary btn-md">
              Crear cuenta gratis
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </div>
        </div>

        {/* 4-step workflow ledger */}
        <div className="border border-[var(--border)] rounded-lg bg-[var(--surface)] p-6 space-y-6">
          <span className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block border-b border-[var(--border)] pb-2">
            FLUJO DE TRABAJO // 4 PASOS
          </span>

          <div className="space-y-4 font-mono text-xs">
            <div className="flex gap-4">
              <span className="text-[var(--accent)] font-bold">01</span>
              <div>
                <strong className="text-[var(--text)] block font-sans">Pega cualquier URL</strong>
                <p className="text-[var(--muted)] text-[11px] mt-0.5">Detectamos el sitio y activamos el scraper en memoria.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-[var(--accent)] font-bold">02</span>
              <div>
                <strong className="text-[var(--text)] block font-sans">Extracción de metadata</strong>
                <p className="text-[var(--muted)] text-[11px] mt-0.5">Capturamos título, descripción e imagen de portada automáticamente.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-[var(--accent)] font-bold">03</span>
              <div>
                <strong className="text-[var(--text)] block font-sans">Clasifica y etiqueta</strong>
                <p className="text-[var(--muted)] text-[11px] mt-0.5">Asigna tags temáticas con códigos de color de alto contraste.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-[var(--accent)] font-bold">04</span>
              <div>
                <strong className="text-[var(--text)] block font-sans">Consulta con ⌘K</strong>
                <p className="text-[var(--muted)] text-[11px] mt-0.5">Accede a todo tu archivo al instante usando el teclado.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
)

const LandingFooter = () => (
  <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-8 px-4 sm:px-6 lg:px-8">
    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 flex items-center justify-center bg-[var(--surface-2)] border border-[var(--accent)] rounded-[2px]">
          <Bookmark className="w-3 h-3 text-[var(--accent)]" />
        </div>
        <span className="font-sans font-bold text-sm tracking-tight text-[var(--text)]">
          LinkStash
        </span>
        <span className="mono text-[9px] text-[var(--muted)] ml-2">V4 LIVING ARCHIVE</span>
      </div>

      <p className="mono text-[10px] text-[var(--muted)]">
        © 2026 LinkStash. Organiza tus enlaces de manera inteligente.
      </p>
    </div>
  </footer>
)

const Landing = () => {
  const { isReady, isChecking, error } = useBackendWakeup()

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans flex flex-col selection:bg-[var(--accent)] selection:text-[var(--accent-text)]">
      <ConnectionErrorBanner error={error} />
      <LandingNavbar isReady={isReady} isChecking={isChecking} error={error} />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <BenefitsSection />
      </main>
      <LandingFooter />
    </div>
  )
}

export default Landing
