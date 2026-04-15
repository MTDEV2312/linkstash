import api from './api'

class TagService {
    // Crear una nueva etiqueta
    async createTag(tagData) {
      const response = await api.post('/tags', tagData)
      // Normalizar respuesta: backend devuelve { success, data: { tag } }
      return response.data?.data?.tag ?? response.data
  }
    async getAllTags() {
            const response = await api.get('/tags', { params: { all: true, limit: 5 } })
            // Normalizar: backend devuelve { success, data: { tags } }
            return response.data?.data?.tags ?? response.data
    }
    async getTagsPage(params = {}) {
            const response = await api.get('/tags', {
                params: {
                    page: params.page ?? 1,
                    limit: params.limit ?? 5,
                    search: params.search ?? '',
                    popular: params.popular ?? 'false'
                }
            })
            return response.data?.data ?? response.data
  }
  async getTagById(id) {
      const response = await api.get(`/tags/${id}`)
      return response.data?.data?.tag ?? response.data
  }
  async updateTag(id, tagData) {
      const response = await api.put(`/tags/${id}`, tagData)
      return response.data?.data?.tag ?? response.data
  }
  async deleteTag(id) {
      const response = await api.delete(`/tags/${id}`)
      return response.data
  }
  async tagStats(){
      const response = await api.get('/tags/stats')
      return response.data?.data?.stats ?? response.data
  }
}

export default new TagService()