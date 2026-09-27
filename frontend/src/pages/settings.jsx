import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import AccountForm from '../components/AccountForm'
import { useDarkMode } from '../hooks/useDarkMode'
import { Sun, Moon, Palette, Command } from 'lucide-react'

const Settings = () => {
  const { user, token, checkAuth } = useAuthStore()
  const [isDark, toggleDarkMode] = useDarkMode()

  useEffect(() => {
    if (!user && token) checkAuth()
  }, [user, token, checkAuth])

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <span className="mono text-xs text-[var(--accent)] font-semibold uppercase tracking-wider block mb-1">
          ACCESO REQUERIDO
        </span>
        <h2 className="text-2xl font-bold font-sans tracking-tight mb-2 text-[var(--text)]">
          Configuración
        </h2>
        <p className="text-xs text-[var(--muted)]">
          Necesitas iniciar sesión para ver y editar tu configuración personal.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--border)]">
        <span className="mono text-[10px] text-[var(--accent)] font-semibold uppercase tracking-wider block mb-1">
          SISTEMA // PREFERENCIAS
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[var(--text)]">
          Configuración
        </h1>
        <p className="mono text-xs text-[var(--muted)] mt-1">
          Administra tu perfil, credenciales de acceso, apariencia y atajos del catálogo
        </p>
      </div>

      {/* Theme Appearance Section */}
      <section className="card p-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[var(--border)]">
          <div className="p-2 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent)]">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <span className="mono text-[9px] text-[var(--accent)] uppercase font-semibold block">
              APARIENCIA
            </span>
            <h2 className="font-sans font-bold text-base text-[var(--text)] tracking-tight">
              Tema del Living Archive
            </h2>
          </div>
        </div>

        <p className="text-xs text-[var(--muted)] mb-4">
          Selecciona tu esquema visual preferido. LinkStash persiste tu configuración automáticamente.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dark Catalog Option */}
          <button
            type="button"
            onClick={() => {
              if (!isDark) toggleDarkMode()
            }}
            className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
              isDark
                ? 'border-[var(--accent)] bg-[var(--surface-2)] ring-1 ring-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
            }`}
          >
            <div className="h-14 rounded bg-[#0b0c0e] border border-[#242832] p-2 flex flex-col justify-between mb-3">
              <div className="flex items-center justify-between">
                <span className="w-2 h-2 rounded-full bg-[#c7ff4a]" />
                <span className="font-mono text-[9px] text-[#989fa6]">#0B0C0E</span>
              </div>
              <div className="h-1.5 w-16 bg-[#1a1d24] rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-[var(--accent)]" />
                <strong className="font-sans text-sm font-semibold text-[var(--text)]">
                  Dark Catalog
                </strong>
              </div>
              {isDark && (
                <span className="mono text-[9px] text-[var(--accent)] font-semibold">ACTIVO</span>
              )}
            </div>
            <p className="mono text-[10px] text-[var(--muted)] mt-1">
              Fondo oscuro, tipografía de alto contraste y acentos acid green.
            </p>
          </button>

          {/* Paper Light Option */}
          <button
            type="button"
            onClick={() => {
              if (isDark) toggleDarkMode()
            }}
            className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
              !isDark
                ? 'border-[var(--accent)] bg-[var(--surface-2)] ring-1 ring-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
            }`}
          >
            <div className="h-14 rounded bg-[#fbfbfa] border border-[#e6e6e0] p-2 flex flex-col justify-between mb-3">
              <div className="flex items-center justify-between">
                <span className="w-2 h-2 rounded-full bg-[#8dbb18]" />
                <span className="font-mono text-[9px] text-[#66675f]">#FBFBFA</span>
              </div>
              <div className="h-1.5 w-16 bg-[#f4f4f0] rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-[var(--accent)]" />
                <strong className="font-sans text-sm font-semibold text-[var(--text)]">
                  Paper Light
                </strong>
              </div>
              {!isDark && (
                <span className="mono text-[9px] text-[var(--accent)] font-semibold">ACTIVO</span>
              )}
            </div>
            <p className="mono text-[10px] text-[var(--muted)] mt-1">
              Superficies cálidas inspiradas en papel y tipografía editorial nítida.
            </p>
          </button>
        </div>
      </section>

      {/* Account Forms Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AccountForm mode="profile" />
        <AccountForm mode="password" />
      </section>

      {/* Keyboard Shortcuts Reference */}
      <section className="card p-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[var(--border)]">
          <div className="p-2 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent)]">
            <Command className="w-4 h-4" />
          </div>
          <div>
            <span className="mono text-[9px] text-[var(--accent)] uppercase font-semibold block">
              PRODUCTIVIDAD
            </span>
            <h2 className="font-sans font-bold text-base text-[var(--text)] tracking-tight">
              Atajos de teclado globales
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between">
            <span className="text-[var(--muted)]">Paleta de comandos</span>
            <kbd className="mono text-[10px] bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--text)]">⌘K / Ctrl+K</kbd>
          </div>
          <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between">
            <span className="text-[var(--muted)]">Buscar enlaces</span>
            <kbd className="mono text-[10px] bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--text)]">/</kbd>
          </div>
          <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between">
            <span className="text-[var(--muted)]">Nuevo enlace</span>
            <kbd className="mono text-[10px] bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--text)]">N</kbd>
          </div>
          <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between">
            <span className="text-[var(--muted)]">Cerrar modal/drawer</span>
            <kbd className="mono text-[10px] bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--text)]">ESC</kbd>
          </div>
        </div>
      </section>

      <p className="mono text-[10px] text-[var(--muted)] text-center">
        LinkStash Architecture v4.0.0 — Modificaciones persistidas de forma sincrónica con la API.
      </p>
    </div>
  )
}

export default Settings
