import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * Error Boundary para capturar errores de componentes React
 * Evita que toda la aplicación se rompa por un error en un componente
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    }
  }

  static getDerivedStateFromError(error) {
    // Actualizar estado para renderizar UI de fallback
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log del error (se puede enviar a servicio de tracking)
    console.error('Error capturado por ErrorBoundary:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
      errorCount: this.state.errorCount + 1,
    })

    // Enviar a servicio de error tracking (ej. Sentry)
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      // UI de fallback personalizada
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Algo salió mal
            </h1>

            <p className="text-gray-600 text-center mb-6">
              Lo sentimos, ha ocurrido un error inesperado. No te preocupes, tu información está segura.
            </p>

            {this.state.errorCount > 2 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <p className="text-sm text-yellow-700">
                  <strong>Nota:</strong> Este error se ha repetido {this.state.errorCount} veces. 
                  Si persiste, intenta recargar la página completamente.
                </p>
              </div>
            )}

            {/* Detalles técnicos (solo en desarrollo) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 bg-gray-50 p-4 rounded-lg">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Detalles técnicos (desarrollo)
                </summary>
                <div className="text-xs font-mono text-gray-600 space-y-2">
                  <div>
                    <strong>Error:</strong>
                    <pre className="mt-1 p-2 bg-red-50 rounded overflow-auto">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 p-2 bg-gray-100 rounded overflow-auto max-h-48">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <RefreshCw className="w-5 h-5" />
                Intentar de nuevo
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                <Home className="w-5 h-5" />
                Ir al inicio
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              Si el problema persiste, por favor contacta a soporte técnico.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
