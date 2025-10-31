import { useState } from 'react'
import LinkForm from '../components/LinkForm'
import { Plus, Grid, List, Filter } from 'lucide-react'

const Dashboard = () => {
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // mantenemos el control visual pero no listamos aquí

  const handleLinkSaved = () => {
    setShowLinkForm(false)
    // Los enlaces se muestran en la página "Mis Enlaces" (myLinks.jsx)
  }

  return (
    <div className="space-y-6">
      {/* Header simple para Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Crea y gestiona tus enlaces — usa "Mis Enlaces" para verlos todos.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-gray-300">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 border-l border-gray-300 ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowLinkForm(true)}
            className="btn-primary btn-md flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar enlace
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-content">
          <p className="text-sm text-gray-600">Los enlaces del usuario se muestran en la página "Mis Enlaces".</p>
        </div>
      </div>

      {/* Modal de formulario */}
      {showLinkForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowLinkForm(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <LinkForm 
                onSave={handleLinkSaved}
                onCancel={() => setShowLinkForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
