import { create } from 'zustand'
import TagService from '../services/tagService'
import toast from 'react-hot-toast'

const useTagStore = create((set, get) => ({
  tags: [],
  isLoading: false,

  fetchTags: async () => {
    set({ isLoading: true })
    try {
      const data = await TagService.getAllTags()
      set({ tags: data || [], isLoading: false })
      return { success: true }
    } catch (error) {
      set({ isLoading: false })
      const message = error?.response?.data?.message || 'Error al cargar etiquetas'
      toast.error(message)
      return { success: false, message }
    }
  },

  createTag: async (tagData) => {
    set({ isLoading: true })
    try {
      const tag = await TagService.createTag(tagData)
      set(state => ({ tags: [tag, ...state.tags], isLoading: false }))
      toast.success('Etiqueta creada')
      return { success: true, tag }
    } catch (error) {
      set({ isLoading: false })
      const message = error?.response?.data?.message || 'No fue posible crear la etiqueta'
      toast.error(message)
      return { success: false, message }
    }
  },

  updateTag: async (id, tagData) => {
    set({ isLoading: true })
    try {
      const updated = await TagService.updateTag(id, tagData)
      set(state => ({ tags: state.tags.map(t => (t._id === id ? updated : t)), isLoading: false }))
      toast.success('Etiqueta actualizada')
      return { success: true, tag: updated }
    } catch (error) {
      set({ isLoading: false })
      const message = error?.response?.data?.message || 'No fue posible actualizar la etiqueta'
      toast.error(message)
      return { success: false, message }
    }
  },

  deleteTag: async (id) => {
    set({ isLoading: true })
    try {
      await TagService.deleteTag(id)
      set(state => ({ tags: state.tags.filter(t => t._id !== id), isLoading: false }))
      toast.success('Etiqueta eliminada')
      return { success: true }
    } catch (error) {
      set({ isLoading: false })
      const message = error?.response?.data?.message || 'Error al eliminar etiqueta'
      toast.error(message)
      return { success: false, message }
    }
  }
}))

export default useTagStore
