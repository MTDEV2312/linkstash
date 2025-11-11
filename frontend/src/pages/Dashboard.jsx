import { useState, useEffect } from 'react'
import LinkForm from '../components/LinkForm'
import LinkCard from '../components/LinkCard'
import TagCard from '../components/TagCard'
import dashboardService from '../services/dashboardService'
import { Plus, Grid, List, Filter, Eye, Heart, Archive, Tag } from 'lucide-react'

const StatCard = ({ title, value, icon: Icon }) => (
  <div className="bg-white border rounded-md p-4 flex items-center gap-3">
    <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center text-primary-600">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  </div>
)

const Dashboard = () => {
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [topTags, setTopTags] = useState([])
  const [recentLinks, setRecentLinks] = useState([])

  const handleLinkSaved = () => {
    setShowLinkForm(false)
    loadData()
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await dashboardService.getSummary()
      if (res && res.success) {
        setSummary(res.data.summary || null)
        setTopTags(res.data.topTags || [])
        setRecentLinks(res.data.recentLinks || [])
      }
    } catch (e) {
      console.error('Error cargando dashboard:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Resumen rápido de tus enlaces y etiquetas.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLinkForm(true)}
            className="btn-primary btn-md flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar enlace
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total enlaces" value={loading ? '—' : (summary ? summary.totalLinks : 0)} icon={Tag} />
        <StatCard title="Favoritos" value={loading ? '—' : (summary ? summary.favorites : 0)} icon={Heart} />
        <StatCard title="Archivados" value={loading ? '—' : (summary ? summary.archived : 0)} icon={Archive} />
        <StatCard title="Necesitan descripción" value={loading ? '—' : (summary ? summary.needsDescription : 0)} icon={Filter} />
        <StatCard title="Visitas totales" value={loading ? '—' : (summary ? summary.totalClicks : 0)} icon={Eye} />
      </div>

      {/* Middle: Top tags + Recent links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-medium">Top etiquetas</h3>
            </div>
            <div className="card-content space-y-2">
              {loading && <div className="text-sm text-gray-500">Cargando...</div>}
              {!loading && topTags.length === 0 && <div className="text-sm text-gray-500">No hay etiquetas aún.</div>}
              {!loading && topTags.map(tag => (
                <TagCard key={tag._id} tag={{ ...tag, count: tag.linkCount }} />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-sm font-medium">Enlaces recientes</h3>
              <div className="text-xs text-gray-500">Últimos 6</div>
            </div>
            <div className="card-content space-y-3">
              {loading && <div className="text-sm text-gray-500">Cargando...</div>}
              {!loading && recentLinks.length === 0 && <div className="text-sm text-gray-500">Aún no has guardado enlaces.</div>}
              {!loading && recentLinks.map(link => (
                <LinkCard key={link._id} link={link} mode="minimal" onUpdate={loadData} />
              ))}
            </div>
          </div>
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
