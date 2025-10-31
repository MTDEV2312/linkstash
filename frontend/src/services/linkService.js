import api from './api'

class LinkService {
  // Obtener todos los enlaces
  async getLinks(params = {}) {
    const response = await api.get('/links', { params })
    return response.data
  }

  // Guardar nuevo enlace
  async saveLink(linkData) {
    const response = await api.post('/links/save-link', linkData)
    return response.data
  }

  // Obtener enlace por ID
  async getLinkById(id) {
    const response = await api.get(`/links/${id}`)
    return response.data
  }

  // Actualizar enlace
  async updateLink(id, linkData) {
    const response = await api.put(`/links/${id}`, linkData)
    return response.data
  }

  // Eliminar enlace
  async deleteLink(id) {
    const response = await api.delete(`/links/${id}`)
    return response.data
  }

  // Alternar favorito
  async toggleFavorite(id) {
    const response = await api.post(`/links/${id}/favorite`)
    return response.data
  }

  // Incrementar contador de clics
  async incrementClickCount(id) {
    const response = await api.post(`/links/${id}/click`)
    return response.data
  }
  // Alternar archivado
  async toggleArchive(id) {
    const response = await api.post(`/links/${id}/archive`)
    return response.data
  }

  // Validar URL
  isValidUrl(string) {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  // Normalizar URL
  normalizeUrl(url) {
    if (!url) return ''
    
    // Agregar https:// si no tiene protocolo
    if (!url.match(/^https?:\/\//)) {
      url = 'https://' + url
    }
    
    return url
  }

  // Extraer dominio de URL
  extractDomain(url) {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch (error) {
      return ''
    }
  }

  // Generar preview de URL
  generatePreview(url) {
    const domain = this.extractDomain(url)
    return {
      domain,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}`,
      isSecure: url.startsWith('https://')
    }
  }
}

export default new LinkService()
