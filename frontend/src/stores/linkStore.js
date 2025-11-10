import { create } from 'zustand'
import linkService from '../services/linkService'
import toast from 'react-hot-toast'

export const useLinkStore = create((set, get) => ({
  links: [],
  currentLink: null,
  isLoading: false,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalLinks: 0,
    hasNextPage: false,
    hasPrevPage: false
  },
  filters: {
    search: '',
    tags: [],
    archived: false,
    favorite: null,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  },

  // Obtener enlaces
  fetchLinks: async (params = {}) => {
    set({ isLoading: true })
    try {
      const { filters } = get()
      const queryParams = { ...filters, ...params }
      
      const response = await linkService.getLinks(queryParams)
      const { links, pagination } = response.data
      
      set({
        links,
        pagination,
        isLoading: false
      })
      
      return { success: true }
    } catch (error) {
      set({ isLoading: false })
      const message = error.response?.data?.message || 'Error al obtener los enlaces'
      toast.error(message)
      return { success: false, message }
    }
  },

  // Guardar nuevo enlace
  saveLink: async (linkData) => {
    set({ isLoading: true })
    try {
      const response = await linkService.saveLink(linkData)
      const newLink = response.data.link
      
      // Agregar al inicio de la lista
      set(state => ({
        links: [newLink, ...state.links],
        isLoading: false
      }))
      
      toast.success('Enlace guardado exitosamente')
      return { success: true, link: newLink }
    } catch (error) {
      set({ isLoading: false })
      const message = error.response?.data?.message || 'Error al guardar el enlace'
      toast.error(message)
      return { success: false, message }
    }
  },

  // Obtener enlace por ID
  fetchLinkById: async (id) => {
    set({ isLoading: true })
    try {
      const response = await linkService.getLinkById(id)
      const link = response.data.link
      
      set({
        currentLink: link,
        isLoading: false
      })
      
      return { success: true, link }
    } catch (error) {
      set({ isLoading: false })
      const message = error.response?.data?.message || 'Error al obtener el enlace'
      toast.error(message)
      return { success: false, message }
    }
  },

  // Actualizar enlace (con soporte para imágenes)
  updateLink: async (id, linkData, uploadFile = null, uploadToCloudinary = false) => {
    set({ isLoading: true })
    try {
      const response = await linkService.updateLink(id, linkData, uploadFile, uploadToCloudinary)
      const updatedLink = response.data.link
      
      // Actualizar en la lista
      set(state => ({
        links: state.links.map(link => 
          link._id === id ? updatedLink : link
        ),
        currentLink: state.currentLink?._id === id ? updatedLink : state.currentLink,
        isLoading: false
      }))
      
      toast.success('Enlace actualizado exitosamente')
      return { success: true, link: updatedLink }
    } catch (error) {
      set({ isLoading: false })
      const message = error.response?.data?.message || 'Error al actualizar el enlace'
      toast.error(message)
      return { success: false, message }
    }
  },

  // Actualizar solo datos del enlace (sin imagen)
  updateLinkData: async (id, linkData) => {
    set({ isLoading: true })
    try {
      const response = await linkService.updateLinkData(id, linkData)
      const updatedLink = response.data.link
      
      // Actualizar en la lista
      set(state => ({
        links: state.links.map(link => 
          link._id === id ? updatedLink : link
        ),
        currentLink: state.currentLink?._id === id ? updatedLink : state.currentLink,
        isLoading: false
      }))
      
      toast.success('Enlace actualizado exitosamente')
      return { success: true, link: updatedLink }
    } catch (error) {
      set({ isLoading: false })
      const message = error.response?.data?.message || 'Error al actualizar el enlace'
      toast.error(message)
      return { success: false, message }
    }
  },

  // Eliminar enlace
  deleteLink: async (id) => {
    set({ isLoading: true })
    try {
      await linkService.deleteLink(id)
      
      // Remover de la lista
      set(state => ({
        links: state.links.filter(link => link._id !== id),
        currentLink: state.currentLink?._id === id ? null : state.currentLink,
        isLoading: false
      }))
      
      toast.success('Enlace eliminado exitosamente')
      return { success: true }
    } catch (error) {
      set({ isLoading: false })
      const message = error.response?.data?.message || 'Error al eliminar el enlace'
      toast.error(message)
      return { success: false, message }
    }
  },

  // Alternar favorito
  toggleFavorite: async (id) => {
    try {
      const response = await linkService.toggleFavorite(id)
      const { isFavorite } = response.data
      
      // Actualizar en la lista
      set(state => ({
        links: state.links.map(link => 
          link._id === id ? { ...link, isFavorite } : link
        ),
        currentLink: state.currentLink?._id === id 
          ? { ...state.currentLink, isFavorite }
          : state.currentLink
      }))
      
      toast.success(isFavorite ? 'Añadido a favoritos' : 'Eliminado de favoritos')
      return { success: true, isFavorite }
    } catch (error) {
      const message = error.response?.data?.message || 'Error al actualizar favorito'
      toast.error(message)
      return { success: false, message }
    }
  },

  // Alternar archivado
  toggleArchive: async (id) => {
    try {
      const response = await linkService.toggleArchive(id)
      const { archived } = response.data

      // Actualizar en la lista
      set(state => ({
        links: state.links.map(link => 
          link._id === id ? { ...link, isArchived: archived } : link
        ),
        currentLink: state.currentLink?._id === id 
          ? { ...state.currentLink, isArchived: archived }
          : state.currentLink
      }))

      toast.success(archived ? 'Enlace archivado' : 'Enlace desarchivado')
      return { success: true, archived }
    } catch (error) {
      const message = error.response?.data?.message || 'Error al actualizar archivado'
      toast.error(message)
      return { success: false, message }
    }
  },

  // Incrementar contador de clics
  incrementClickCount: async (id) => {
    try {
      const response = await linkService.incrementClickCount(id)
      const { clickCount } = response.data
      
      // Actualizar en la lista
      set(state => ({
        links: state.links.map(link => 
          link._id === id ? { ...link, clickCount, lastVisited: new Date() } : link
        ),
        currentLink: state.currentLink?._id === id 
          ? { ...state.currentLink, clickCount, lastVisited: new Date() }
          : state.currentLink
      }))
      
      return { success: true, clickCount }
    } catch (error) {
      console.error('Error al incrementar contador:', error)
      return { success: false }
    }
  },

  // Actualizar filtros
  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters }
    }))
  },

  // Limpiar filtros
  clearFilters: () => {
    set({
      filters: {
        search: '',
        tags: [],
        archived: false,
        favorite: null,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }
    })
  },

  // Limpiar enlace actual
  clearCurrentLink: () => {
    set({ currentLink: null })
  },

  // Buscar enlaces
  searchLinks: async (query) => {
    const { fetchLinks, setFilters } = get()
    setFilters({ search: query, page: 1 })
    return await fetchLinks()
  },

  // Filtrar por etiquetas
  filterByTags: async (tags) => {
    const { fetchLinks, setFilters } = get()
    setFilters({ tags, page: 1 })
    return await fetchLinks()
  },

  // Cambiar página
  changePage: async (page) => {
    const { fetchLinks } = get()
    return await fetchLinks({ page })
  }
}));
