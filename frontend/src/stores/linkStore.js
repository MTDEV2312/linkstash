import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import linkService from '../services/linkService'
import { showSuccess, showError } from '../utils/toastUtils'
import { classifyError, ERROR_TYPES } from '../utils/errorClassifier'

const MAX_LINKS_PER_PAGE = 5

// Estado normalizado: links por ID para búsqueda rápida
export const useLinkStore = create(
  persist(
    (set, get) => ({
      // Normalized state: links stored by ID for O(1) lookup
      linksById: {},
      linkIds: [],
      currentLink: null,
      isLoading: false,
      error: null, // Error actual para mostrar en UI
      _hydrated: false,
      
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

      // Obtener links como función (no getter para mejor compatibilidad con persist)
      getLinks: function() {
        const state = this
        return state.linkIds.map(id => state.linksById[id]).filter(Boolean)
      },

      // Normalizar datos entrantes
      normalizeLinks: (links) => {
        const linksById = {}
        const linkIds = []
        links.forEach(link => {
          if (link._id) {
            linksById[link._id] = link
            linkIds.push(link._id)
          }
        })
        return { linksById, linkIds }
      },

      // Obtener enlaces con soporte para cancelación
      fetchLinks: async (params = {}, signal = null) => {
        set({ isLoading: true })
        try {
          const { filters, normalizeLinks } = get()
          const requestedLimit = params.limit ?? filters.limit ?? MAX_LINKS_PER_PAGE
          const queryParams = {
            ...filters,
            ...params,
            limit: Math.min(Math.max(parseInt(requestedLimit, 10) || MAX_LINKS_PER_PAGE, 1), MAX_LINKS_PER_PAGE)
          }
          
          const response = await linkService.getLinks(queryParams, signal)
          const payload = response?.data?.data ?? response?.data
          const { links, pagination } = payload || {}
          
          const normalized = normalizeLinks(Array.isArray(links) ? links : [])
          
          set({
            linksById: normalized.linksById,
            linkIds: normalized.linkIds,
            pagination: pagination || {
              currentPage: 1,
              totalPages: 1,
              totalLinks: 0,
              hasNextPage: false,
              hasPrevPage: false
            },
            isLoading: false
          })
          
          return { success: true }
        } catch (error) {
          const classified = classifyError(error)
          
          // No guardar error para AbortError
          if (classified.type === ERROR_TYPES.ABORT) {
            set({ isLoading: false })
            return { success: false, message: 'Búsqueda cancelada', aborted: true }
          }

          set({ 
            isLoading: false,
            error: classified,
            linksById: {},
            linkIds: [],
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalLinks: 0,
              hasNextPage: false,
              hasPrevPage: false
            }
          })

          // Mostrar notificación solo para ciertos tipos
          if (classified.type !== ERROR_TYPES.NETWORK && classified.type !== ERROR_TYPES.VALIDATION) {
            showError(classified.message)
          }

          return { 
            success: false, 
            message: classified.message,
            errorType: classified.type,
            validationErrors: classified.validationErrors
          }
        }
      },

      // Guardar nuevo enlace
      saveLink: async (linkData) => {
        set({ isLoading: true, error: null })
        try {
          const response = await linkService.saveLink(linkData)
          const newLink = response.data.link
          
          if (!newLink._id) throw new Error('Invalid link response')
          
          set(state => ({
            linksById: { [newLink._id]: newLink, ...state.linksById },
            linkIds: [newLink._id, ...state.linkIds],
            isLoading: false,
            error: null,
            pagination: state.pagination ? 
              { ...state.pagination, totalLinks: state.pagination.totalLinks + 1 } 
              : state.pagination
          }))
          
          showSuccess('Enlace guardado exitosamente')
          return { success: true, link: newLink }
        } catch (error) {
          const classified = classifyError(error)
          set({ 
            isLoading: false,
            error: classified
          })
          
          // Mostrar notificación para todos los errores aquí
          showError(classified.message)
          
          return { 
            success: false, 
            message: classified.message,
            errorType: classified.type,
            validationErrors: classified.validationErrors
          }
        }
      },
      // Refrescar datos después de mutaciones
      refetchLinks: async () => {
        const { fetchLinks, filters } = get()
        return await fetchLinks(filters)
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
          try {
            const status = error?.response?.status
              if (!status || status >= 500) showError(message)
          } catch (t) {}
          return { success: false, message }
        }
      },

      // Actualizar enlace (con soporte para imágenes)
      updateLink: async (id, linkData, uploadFile = null, uploadToStorage = false) => {
        set({ isLoading: true })
        try {
          const response = await linkService.updateLink(id, linkData, uploadFile, uploadToStorage)
          const updatedLink = response.data.link
          
          set(state => ({
            linksById: { ...state.linksById, [id]: updatedLink },
            currentLink: state.currentLink?._id === id ? updatedLink : state.currentLink,
            isLoading: false
          }))
          
          showSuccess('Enlace actualizado exitosamente')
          return { success: true, link: updatedLink }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Error al actualizar el enlace'
          try {
            const status = error?.response?.status
              if (!status || status >= 500) showError(message)
          } catch (t) {}
          return { success: false, message }
        }
      },

      // Actualizar solo datos del enlace (sin imagen)
      updateLinkData: async (id, linkData) => {
        set({ isLoading: true })
        try {
          const response = await linkService.updateLinkData(id, linkData)
          const updatedLink = response.data.link
          
          set(state => ({
            linksById: { ...state.linksById, [id]: updatedLink },
            currentLink: state.currentLink?._id === id ? updatedLink : state.currentLink,
            isLoading: false
          }))
          
          showSuccess('Enlace actualizado exitosamente')
          return { success: true, link: updatedLink }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Error al actualizar el enlace'
          try {
            const status = error?.response?.status
              if (!status || status >= 500) showError(message)
          } catch (t) {}
          return { success: false, message }
        }
      },

      // Eliminar enlace
      deleteLink: async (id) => {
        set({ isLoading: true })
        try {
          await linkService.deleteLink(id)
          
          set(state => {
            const { [id]: _, ...remainingLinks } = state.linksById
            return {
              linksById: remainingLinks,
              linkIds: state.linkIds.filter(linkId => linkId !== id),
              currentLink: state.currentLink?._id === id ? null : state.currentLink,
              isLoading: false
            }
          })
          
          showSuccess('Enlace eliminado exitosamente')
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Error al eliminar el enlace'
          try {
            const status = error?.response?.status
              if (!status || status >= 500) showError(message)
          } catch (t) {}
          return { success: false, message }
        }
      },

      // Alternar favorito
      toggleFavorite: async (id) => {
        try {
          const response = await linkService.toggleFavorite(id)
          const { isFavorite } = response.data
          
          set(state => ({
            linksById: {
              ...state.linksById,
              [id]: { ...state.linksById[id], isFavorite }
            },
            currentLink: state.currentLink?._id === id 
              ? { ...state.currentLink, isFavorite }
              : state.currentLink,
            error: null
          }))
          
          showSuccess(isFavorite ? 'Añadido a favoritos' : 'Eliminado de favoritos')
          return { success: true, isFavorite }
        } catch (error) {
          const classified = classifyError(error)
          set({ error: classified })
          showError(classified.message)
          return { 
            success: false, 
            message: classified.message,
            errorType: classified.type
          }
        }
      },

      // Invalidar cache de links después de cambios en tags
      invalidateLinksByTags: async (tags) => {
        const { fetchLinks, filters } = get()
        if (filters.tags && filters.tags.length > 0) {
          return await fetchLinks(filters)
        }
        return { success: true }
      },

      // Alternar archivado
      toggleArchive: async (id) => {
        try {
          const response = await linkService.toggleArchive(id)
          const { archived } = response.data

          set(state => ({
            linksById: {
              ...state.linksById,
              [id]: { ...state.linksById[id], isArchived: archived }
            },
            currentLink: state.currentLink?._id === id 
              ? { ...state.currentLink, isArchived: archived }
              : state.currentLink,
            error: null
          }))

          showSuccess(archived ? 'Enlace archivado' : 'Enlace desarchivado')
          return { success: true, archived }
        } catch (error) {
          const classified = classifyError(error)
          set({ error: classified })
          showError(classified.message)
          return { 
            success: false, 
            message: classified.message,
            errorType: classified.type
          }
        }
      },

      // Incrementar contador de clics
      incrementClickCount: async (id) => {
        try {
          const response = await linkService.incrementClickCount(id)
          const { clickCount } = response.data
          
          set(state => ({
            linksById: {
              ...state.linksById,
              [id]: { ...state.linksById[id], clickCount, lastVisited: new Date() }
            },
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
      prefetchNextPage: async () => {
        const { pagination, filters, linksById, linkIds, normalizeLinks } = get()
        
        // No prefetchear si no hay siguiente página o ya está cargando
        if (!pagination?.hasNextPage) return { success: false }

        try {
          const nextPage = pagination.currentPage + 1
          const response = await linkService.getLinks(
            { ...filters, page: nextPage },
            null // sin signal
          )
          
          const payload = response?.data?.data ?? response?.data
          const { links: newLinks } = payload || {}

          if (!Array.isArray(newLinks) || newLinks.length === 0) {
            return { success: false }
          }

          // Normalizar nuevos links
          const newNormalized = normalizeLinks(newLinks)

          // Agregar a estado sin reemplazar existing (merge)
          set(state => ({
            linksById: { ...state.linksById, ...newNormalized.linksById },
            linkIds: [...state.linkIds, ...newNormalized.linkIds.filter(
              id => !state.linkIds.includes(id)
            )]
          }))

          return { success: true, count: newLinks.length }
        } catch (error) {
          // Silencioso en prefetch, no mostrar errores
          console.debug('Prefetch fallido:', error.message)
          return { success: false }
        }
      },

      // Cargar siguiente página (mostrar loading, actualizar paginación)
      loadNextPage: async () => {
        const { pagination, filters, fetchLinks } = get()
        
        if (!pagination?.hasNextPage) {
          return { success: false }
        }

        return await fetchLinks({
          ...filters,
          page: pagination.currentPage + 1
        })
      },

      // Cargar página anterior
      loadPreviousPage: async () => {
        const { pagination, filters, fetchLinks } = get()
        
        if (!pagination?.hasPrevPage) {
          return { success: false }
        }

        return await fetchLinks({
          ...filters,
          page: pagination.currentPage - 1
        })
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
      },

      // Limpiar error
      clearError: () => {
        set({ error: null })
      },

      // Marcar como hidratado
      setHydrated: () => set({ _hydrated: true })
    }),
    {
      name: 'linkstore-storage',
      partialize: (state) => ({
        // Solo persistir: links normalizados, filtros, y estado de hidratación
        linksById: state.linksById,
        linkIds: state.linkIds,
        filters: state.filters,
        pagination: state.pagination,
        _hydrated: true
      }),
      onRehydrateStorage: () => (state) => {
        // Validar integridad de datos normalizados después de restaurar
        if (state) {
          // Asegurar que linkIds no tiene duplicados ni IDs inexistentes
          const validIds = state.linkIds.filter(id => state.linksById[id])
          if (validIds.length !== state.linkIds.length) {
            state.linkIds = validIds
          }
        }
      }
    }
  )
);
