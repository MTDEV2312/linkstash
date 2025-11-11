import api from './api'

class DashboardService {
  async getSummary() {
    const response = await api.get('/dashboard/summary')
    return response.data
  }
}

export default new DashboardService()
