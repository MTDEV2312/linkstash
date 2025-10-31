import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { 
  Menu, 
  X, 
  Home, 
  Bookmark, 
  Tag, 
  Settings, 
  LogOut, 
  User,
  Search,
  Plus
} from 'lucide-react'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Mis Enlaces', href: '/my-links', icon: Bookmark },
    { name: 'Etiquetas', href: '/tags', icon: Tag },
    { name: 'Configuración', href: '/settings', icon: Settings },
  ]

  const location = useLocation()
  const currentPath = location.pathname
  const currentNav = navigation.find(item => currentPath === item.href || currentPath.startsWith(item.href + '/'))
  const pageTitle = currentNav ? currentNav.name : 'Dashboard'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar móvil */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setSidebarOpen(false)} />
        <div className="fixed top-0 left-0 w-64 h-full bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">LinkStash</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="mt-4">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200 lg:bg-white">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-primary-600">🔗 LinkStash</h1>
          </div>
          <nav className="mt-8 flex-1">
            <div className="px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <Icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </nav>
          
          {/* Usuario */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user?.username}</p>
                <button
                  onClick={handleLogout}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                >
                  <LogOut className="w-3 h-3 mr-1" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Header móvil */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">LinkStash</h1>
            <div className="w-9" /> {/* Spacer */}
          </div>
        </div>

        {/* Header desktop */}
        <header className="hidden lg:block bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-gray-900">{pageTitle}</h2>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">{user?.username}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
