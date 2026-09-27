import { useState, useEffect } from 'react'
import LinkForm from '../components/LinkForm'
import LinkCard from '../components/LinkCard'
import TagCard from '../components/TagCard'
import dashboardService from '../services/dashboardService'
import { Plus, Filter, Eye, Heart, Archive, Tag, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const StatCard = ({ title, value, icon: Icon, highlight = false }) => (
  <div className={`p-4 rounded-lg border bg-[var(--surface)] transition-all ${
    highlight 
      ? 'border-[var(--accent)]/50 shadow-xs' 
      : 'border-[var(--border)] hover:border-[var(--border-strong)]'
  }`}>
    <div className="flex items-center justify-between mb-3">
      <span className="mono text-[10px] text-[var(--muted)] uppercase font-semibold">
        {title}
      </span>
      <div className={`w-7 h-7 rounded border border-[var(--border)] flex items-center justify-center ${
        highlight ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'bg-[var(--surface-2)] text-[var(--muted)]'
      }`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
    </div>
    <div className="font-sans font-bold text-3xl sm:text-4xl text-[var(--text)] tracking-tight">
      {value}
    </div>
  </div>
)

const Dashboard = () => {
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    summary: null,
    topTags: [],
    recentLinks: []
  })
  const { summary, topTags, recentLinks } = dashboardData

  const handleLinkSaved = () => {
    setShowLinkForm(false)
    loadData()
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await dashboardService.getOverview()
      if (res && res.success) {
        setDashboardData({
          summary: res.data.summary || null,
          topTags: res.data.topTags || [],
          recentLinks: res.data.recentLinks || []
        })
      }
    } catch (e) {
      console.error('Error cargando dashboard:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="space-y-8 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <span className="mono text-[10px] text-[var(--accent)] font-semibold uppercase tracking-wider block mb-1">
            PANEL DE CONTROL // RESUMEN
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[var(--text)]">
            Dashboard
          </h1>
          <p className="mono text-xs text-[var(--muted)] mt-1">
            Métricas clave, etiquetas más usadas y actividad reciente del catálogo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLinkForm(true)}
            className="btn-primary btn-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar enlace</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <StatCard
          title="Total enlaces"
          value={loading ? '—' : (summary ? summary.totalLinks : 0)}
          icon={Tag}
          highlight
        />
        <StatCard
          title="Favoritos"
          value={loading ? '—' : (summary ? summary.favorites : 0)}
          icon={Heart}
        />
        <StatCard
          title="Archivados"
          value={loading ? '—' : (summary ? summary.archived : 0)}
          icon={Archive}
        />
        <StatCard
          title="Sin descripción"
          value={loading ? '—' : (summary ? summary.needsDescription : 0)}
          icon={Filter}
        />
        <StatCard
          title="Visitas totales"
          value={loading ? '—' : (summary ? summary.totalClicks : 0)}
          icon={Eye}
        />
      </div>

      {/* Middle: Top tags + Recent links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Tags */}
        <div className="lg:col-span-1">
          <div className="card bg-[var(--surface)] border border-[var(--border)] rounded-lg">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="mono text-[9px] text-[var(--accent)] uppercase font-semibold block">
                  TAXONOMÍAS
                </span>
                <h3 className="font-sans font-bold text-sm text-[var(--text)] tracking-tight">
                  Top etiquetas
                </h3>
              </div>
              <Link to="/tags" className="mono text-[10px] text-[var(--muted)] hover:text-[var(--accent)] flex items-center gap-0.5">
                Ver todas <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-4 space-y-2.5">
              {loading && (
                <div className="space-y-2">
                  <div className="h-12 loading-skeleton rounded" />
                  <div className="h-12 loading-skeleton rounded" />
                  <div className="h-12 loading-skeleton rounded" />
                </div>
              )}
              {!loading && (!topTags || topTags.length === 0) && (
                <div className="mono text-xs text-[var(--muted)] text-center py-6">
                  No hay etiquetas registradas aún.
                </div>
              )}
              {!loading && topTags?.map(tag => (
                <TagCard key={tag._id} tag={{ ...tag, count: tag.linkCount }} />
              ))}
            </div>
          </div>
        </div>

        {/* Recent Links */}
        <div className="lg:col-span-2">
          <div className="card bg-[var(--surface)] border border-[var(--border)] rounded-lg">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="mono text-[9px] text-[var(--accent)] uppercase font-semibold block">
                  ACTIVIDAD
                </span>
                <h3 className="font-sans font-bold text-sm text-[var(--text)] tracking-tight">
                  Enlaces recientes
                </h3>
              </div>
              <Link to="/mylinks" className="mono text-[10px] text-[var(--muted)] hover:text-[var(--accent)] flex items-center gap-0.5">
                Ver archivo completo <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-4 space-y-2.5">
              {loading && (
                <div className="space-y-2">
                  <div className="h-10 loading-skeleton rounded" />
                  <div className="h-10 loading-skeleton rounded" />
                  <div className="h-10 loading-skeleton rounded" />
                </div>
              )}
              {!loading && (!recentLinks || recentLinks.length === 0) && (
                <div className="mono text-xs text-[var(--muted)] text-center py-8">
                  Aún no has guardado enlaces.
                </div>
              )}
              {!loading && recentLinks?.map(link => (
                <LinkCard key={link._id} link={link} mode="minimal" onUpdate={loadData} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save Link Modal */}
      {showLinkForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <button
              type="button"
              aria-label="Cerrar modal de nuevo enlace"
              className="fixed inset-0 transition-opacity bg-black/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setShowLinkForm(false)}
            />
            
            <div className="inline-block align-bottom bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
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
