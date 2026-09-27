import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useLinkStore } from '../stores/linkStore'
import { 
  Home, 
  Bookmark, 
  Tag, 
  Settings, 
  LogOut, 
  User,
  Search,
  Command
} from 'lucide-react'
import DarkModeToggle from './DarkModeToggle'
import ConnectionStatus from './ConnectionStatus'
import CommandPalette from './CommandPalette'

const Layout = ({ children }) => {
  const [commandOpen, setCommandOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const linkIds = useLinkStore((state) => state.linkIds)
  const totalLinks = useLinkStore((state) => state.pagination?.totalLinks ?? linkIds?.length ?? 0)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, shortLabel: 'Inicio' },
    { name: 'Mis Enlaces', href: '/mylinks', icon: Bookmark, shortLabel: 'Enlaces', badge: totalLinks > 0 ? totalLinks : null },
    { name: 'Etiquetas', href: '/tags', icon: Tag, shortLabel: 'Etiquetas' },
    { name: 'Configuración', href: '/settings', icon: Settings, shortLabel: 'Ajustes' },
  ]

  const currentPath = location.pathname
  const currentNav = navigation.find(item => currentPath === item.href || currentPath.startsWith(item.href + '/'))
  const pageTitle = currentNav ? currentNav.name : 'Dashboard'

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans selection:bg-[var(--accent)] selection:text-[var(--accent-text)]">
      {/* Desktop Sidebar: Exactly 232px */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[232px] lg:fixed lg:inset-y-0 lg:left-0 lg:border-r lg:border-[var(--border)] lg:bg-[var(--surface)] z-30">
        {/* Brand Top Header: 88px */}
        <div className="h-[88px] flex flex-col justify-center px-[22px] border-b border-[var(--border)]">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="relative w-6 h-6 flex items-center justify-center">
              <span className="absolute inset-0 bg-[var(--surface-2)] border border-[var(--accent)] rounded-[2px]" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-[var(--accent)]" />
              <Bookmark className="w-3.5 h-3.5 text-[var(--accent)] relative z-10" />
            </div>
            <span className="font-sans font-bold text-lg tracking-tight text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
              LinkStash
            </span>
          </Link>
          <span className="mono text-[8px] text-[var(--muted)] pl-8 tracking-wider">
            LIVING ARCHIVE // V4
          </span>
        </div>

        {/* Primary Desktop Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="mono text-[9px] uppercase tracking-wider text-[var(--subtle)] px-3 py-2">
            Catálogo
          </div>
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`relative flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${
                  isActive
                    ? 'bg-[var(--surface-3)] text-[var(--text)] font-semibold shadow-sm'
                    : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1 h-5 bg-[var(--accent)] rounded-r" />
                )}
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span className={`mono text-[9px] px-1.5 py-0.5 rounded border ${
                    isActive 
                      ? 'border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)] font-semibold' 
                      : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Card & Logout Anchor */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between p-2 rounded bg-[var(--surface-2)] border border-[var(--border)]/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded border border-[var(--border-strong)] bg-[var(--surface-3)] flex items-center justify-center font-mono text-xs text-[var(--accent)] font-semibold flex-shrink-0">
                {user?.username ? user.username.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-[var(--text)] truncate">
                  {user?.username || 'Usuario'}
                </span>
                <span className="mono text-[8px] text-[var(--muted)] block truncate">
                  AUTENTICADO
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--surface-3)] rounded transition-colors"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container: Offset by 232px on Desktop */}
      <div className="lg:pl-[232px] flex flex-col flex-1 min-w-0 min-h-screen">
        {/* Sticky Contextual Topbar Desktop */}
        <header className="sticky top-0 z-20 h-16 backdrop-blur-md bg-[var(--bg)]/85 border-b border-[var(--border)] px-6 hidden lg:flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold font-sans tracking-tight text-[var(--text)]">
              {pageTitle}
            </h1>
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] text-xs text-[var(--muted)] transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span>Buscar o saltar a...</span>
              <kbd className="mono text-[9px] bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--muted)] flex items-center gap-0.5">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
              <span className="signal-dot" />
              <span className="mono text-[10px] text-[var(--muted)]">ONLINE</span>
            </div>
          </div>
        </header>

        {/* Mobile Top Header */}
        <header className="lg:hidden sticky top-0 z-20 h-14 bg-[var(--surface)] border-b border-[var(--border)] px-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center bg-[var(--surface-2)] border border-[var(--accent)] rounded-[2px]">
              <Bookmark className="w-3 h-3 text-[var(--accent)]" />
            </div>
            <span className="font-sans font-bold text-base tracking-tight text-[var(--text)]">
              LinkStash
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="p-2 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]"
              aria-label="Abrir buscador"
            >
              <Search className="w-4 h-4" />
            </button>
            <DarkModeToggle />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Persistent Mobile Bottom Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border)] grid grid-cols-4 h-16 safe-area-bottom">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-mono transition-colors ${
                isActive ? 'text-[var(--accent)] font-semibold' : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} />
              <span>{item.shortLabel}</span>
            </Link>
          )
        })}
      </nav>

      {/* Global Command Palette */}
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />

      {/* Connection Status notification */}
      <ConnectionStatus />
    </div>
  )
}

export default Layout
