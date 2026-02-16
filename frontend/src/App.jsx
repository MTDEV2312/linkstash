import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import { useEffect, lazy, Suspense } from 'react'
import { useDarkMode } from './hooks/useDarkMode'

// Importar páginas críticas directamente (necesarias en el inicio)
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

// Lazy loading para páginas no críticas
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MyLinks = lazy(() => import('./pages/myLinks'))
const Tags = lazy(() => import('./pages/tags'))
const Settings = lazy(() => import('./pages/settings'))

// Componente de carga
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
    </div>
  </div>
)

function App() {
  const { user, checkAuth, isLoading } = useAuthStore()
  const [isDark] = useDarkMode()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors">
          <Suspense fallback={<PageLoader />}>
            <Routes>
          {/* Ruta principal - Landing Page */}
          <Route 
            path="/" 
            element={
              user ? <Navigate to="/dashboard" replace /> : <Landing />
            } 
          />

          {/* Rutas públicas */}
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/dashboard" replace /> : <Login />
            } 
          />
          <Route 
            path="/register" 
            element={
              user ? <Navigate to="/dashboard" replace /> : <Register />
            } 
          />
          
          {/* Rutas protegidas */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/mylinks" 
            element={
              <ProtectedRoute>
                <Layout>
                  <MyLinks />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tags" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Tags />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* Ruta catch-all - Landing o 404 */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-8">Página no encontrada</p>
                  <button 
                    onClick={() => window.history.back()}
                    className="btn-primary btn-md"
                  >
                    Volver atrás
                  </button>
                </div>
              </div>
            } 
          />
        </Routes>
        </Suspense>
        
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
    </ErrorBoundary>
  )
}

export default App
