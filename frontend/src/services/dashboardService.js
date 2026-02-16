import api from './api'

// Cache simple en memoria con TTL para reducir peticiones
const cache = {
  overview: null,
  timestamp: 0
}
const TTL_MS = parseInt(import.meta.env.VITE_DASHBOARD_CACHE_TTL_MS || '10000', 10) // 10s por defecto

class DashboardService {
  async getOverview() {
    try {
      const now = Date.now()
      if (cache.overview && (now - cache.timestamp) < TTL_MS) {
        const res = cache.overview
        // marcar origen
        res.__fromCache = true
        return res
      }

      const response = await api.get('/dashboard/overview')
      cache.overview = response.data
      cache.timestamp = Date.now()
      const res = response.data
      res.__fromCache = false
      return res
    } catch (err) {
      // En caso de error, devolver caché si existe
      if (cache.overview) {
        const res = cache.overview
        res.__fromCache = true
        return res
      }
      throw err
    }
  }
}

export default new DashboardService()
