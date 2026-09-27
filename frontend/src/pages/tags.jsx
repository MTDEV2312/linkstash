import { useEffect, useState } from 'react'
import useTagStore from '../stores/tagStore'
import { useLinkStore } from '../stores/linkStore'
import { toast } from 'react-hot-toast'
import { Plus, X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import TagCard from '../components/TagCard'
import TagCardSkeleton from '../components/Skeletons/TagCardSkeleton'
import TagService from '../services/tagService'

const TagsHeader = ({ showForm, onToggleForm }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[var(--border)]">
    <div>
      <span className="mono text-[10px] text-[var(--accent)] font-semibold uppercase tracking-wider block mb-1">
        ÍNDICE TEMÁTICO
      </span>
      <h1 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[var(--text)]">
        Etiquetas
      </h1>
      <p className="mono text-xs text-[var(--muted)] mt-1">
        Organiza, clasifica y administra las taxonomías de tu archivo
      </p>
    </div>

    <div className="flex items-center gap-2">
      <button type="button" onClick={onToggleForm} className="btn-primary btn-md flex items-center gap-1.5">
        <Plus className="w-4 h-4" />
        <span>{showForm ? 'Cerrar formulario' : 'Nueva etiqueta'}</span>
      </button>
    </div>
  </div>
)

const TagFormCard = ({ showForm, formState, setFormState, colorPalette, onSubmit }) => {
  if (!showForm) return null

  const { name, description, color, editingId } = formState

  return (
    <div className="card p-5 bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg shadow-sm animate-fade-in">
      <span className="mono text-[10px] text-[var(--accent)] uppercase font-semibold block mb-2">
        {editingId ? 'EDITAR TAXONOMÍA' : 'NUEVA TAXONOMÍA'}
      </span>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block mb-1.5">
              Nombre de la etiqueta
            </label>
            <input
              className="input font-mono text-xs"
              placeholder="p. ej. react, devops, ai"
              value={name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              maxLength={50}
              required
            />
          </div>

          <div>
            <label className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block mb-1.5">
              Descripción (opcional)
            </label>
            <input
              className="input text-xs"
              placeholder="Notas o contexto para esta categoría"
              value={description}
              onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
              maxLength={200}
            />
          </div>
        </div>

        <div>
          <label className="mono text-[10px] text-[var(--muted)] uppercase font-semibold block mb-2">
            Código de color identificador
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {colorPalette.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFormState((prev) => ({ ...prev, color: c }))}
                className={`w-7 h-7 rounded-full transition-transform cursor-pointer border ${
                  color === c ? 'scale-115 ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)] border-transparent' : 'border-black/20 hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setFormState((prev) => ({ ...prev, color: e.target.value }))}
              className="h-7 w-9 p-0 rounded border border-[var(--border)] cursor-pointer bg-transparent"
              title="Personalizar color"
            />
            <span className="mono text-xs text-[var(--muted)] uppercase ml-2">{color}</span>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-[var(--border)]">
          <button className="btn-primary btn-md" type="submit">
            {editingId ? 'Guardar cambios' : 'Crear etiqueta'}
          </button>
        </div>
      </form>
    </div>
  )
}

const TagSearchCard = ({ search, onSearchChange, onSearch, onClear }) => (
  <div className="flex items-center gap-3">
    <div className="relative flex-1 max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--muted)]">
        <Search className="w-4 h-4" />
      </div>
      <input
        id="tag-search"
        className="input pl-9 font-mono text-xs"
        placeholder="Buscar etiquetas por nombre..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch()
        }}
      />
    </div>
    <button className="btn-outline btn-md" type="button" onClick={onSearch}>
      Buscar
    </button>
    {search ? (
      <button type="button" onClick={onClear} className="btn-outline btn-md flex items-center gap-1">
        <X className="w-3.5 h-3.5" />
        Limpiar
      </button>
    ) : null}
  </div>
)

const TagsListSection = ({ pageLoading, mutationLoading, tags, pagination, search, onEdit, onDelete, onPageChange }) => {
  if (pageLoading || mutationLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <TagCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!tags || tags.length === 0) {
    return (
      <div className="text-center py-16 px-4 border border-dashed border-[var(--border)] rounded-lg bg-[var(--surface-2)]/30">
        <span className="mono text-[10px] text-[var(--accent)] font-semibold uppercase tracking-wider block mb-1">
          SIN ETIQUETAS
        </span>
        <h3 className="font-sans font-bold text-base text-[var(--text)]">
          No hay etiquetas registradas todavía.
        </h3>
        <p className="text-xs text-[var(--muted)] mt-1">
          Crea tu primera etiqueta para agrupar y filtrar tus enlaces de forma organizada.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tags?.map((tag) => (
          <TagCard key={tag._id} tag={tag} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 font-mono text-xs text-[var(--muted)]">
          <p>
            Página <span className="text-[var(--text)] font-semibold">{pagination.currentPage}</span> de{' '}
            <span className="text-[var(--text)] font-semibold">{pagination.totalPages}</span> ({pagination.totalTags} etiquetas)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(pagination.currentPage - 1, search)}
              disabled={!pagination.hasPrevPage || pageLoading}
              className="btn-outline btn-sm flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </button>
            <button
              type="button"
              onClick={() => onPageChange(pagination.currentPage + 1, search)}
              disabled={!pagination.hasNextPage || pageLoading}
              className="btn-outline btn-sm flex items-center gap-1"
            >
              Siguiente
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const Tags = () => {
  const { isLoading: mutationLoading, createTag, updateTag, deleteTag } = useTagStore()
  const { invalidateLinksByTags } = useLinkStore()
  const [listState, setListState] = useState({
    tags: [],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalTags: 0,
      itemsPerPage: 6,
      hasNextPage: false,
      hasPrevPage: false
    },
    loadError: '',
    search: '',
    pageLoading: false
  })
  const [formState, setFormState] = useState({
    showForm: false,
    name: '',
    editingId: null,
    color: '#84CC16',
    description: ''
  })
  const { tags, pagination, loadError, search, pageLoading } = listState
  const { showForm, name, editingId, color, description } = formState

  const loadTagsPage = async (page = 1, nextSearch = search) => {
    setListState((prev) => ({ ...prev, pageLoading: true }))
    try {
      const res = await TagService.getTagsPage({ page, limit: 6, search: nextSearch })
      setListState((prev) => ({
        ...prev,
        tags: res.tags || [],
        pagination: res.pagination || prev.pagination,
        loadError: '',
        pageLoading: false
      }))
    } catch (error) {
      setListState((prev) => ({
        ...prev,
        loadError: error?.response?.data?.message || 'Error al cargar etiquetas',
        pageLoading: false
      }))
    }
  }

  useEffect(() => {
    loadTagsPage(1, '')
    // Solo carga inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Ingresa un nombre')
    try {
      const payload = { name: name.trim(), color: color || '#84CC16', description: description || '' }
      const res = await createTag(payload)
      if (res.success) {
        setFormState({
          showForm: false,
          name: '',
          editingId: null,
          color: '#84CC16',
          description: ''
        })
        setListState((prev) => ({ ...prev, loadError: '', search: '' }))
        await loadTagsPage(1, '')
        await invalidateLinksByTags()
      }
    } catch (err) {
      console.error(err)
      toast.error('No fue posible crear la etiqueta')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta etiqueta?')) return
    try {
      const res = await deleteTag(id)
      if (res.success) {
        await loadTagsPage(pagination.currentPage, search)
        await invalidateLinksByTags()
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar etiqueta')
    }
  }

  const startEdit = (tag) => {
    setFormState({
      showForm: true,
      name: tag.name,
      editingId: tag._id,
      color: tag.color || '#84CC16',
      description: tag.description || ''
    })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Ingresa un nombre')
    try {
      const payload = { name: name.trim(), color: color || '#84CC16', description: description || '' }
      const res = await updateTag(editingId, payload)
      if (res.success) {
        setFormState({
          showForm: false,
          name: '',
          editingId: null,
          color: '#84CC16',
          description: ''
        })
        await loadTagsPage(pagination.currentPage, search)
        await invalidateLinksByTags()
      }
    } catch (err) {
      console.error(err)
      toast.error('No fue posible actualizar la etiqueta')
    }
  }

  const COLOR_PALETTE = [
    '#EF4444', // red
    '#F97316', // orange
    '#F59E0B', // amber
    '#EAB308', // yellow
    '#84CC16', // lime acid
    '#10B981', // green
    '#06B6D4', // cyan
    '#3B82F6', // blue
    '#7C3AED', // purple
    '#EC4899', // pink
    '#68717A'  // subtle slate
  ]

  return (
    <div className="space-y-6">
      <TagsHeader
        showForm={showForm}
        onToggleForm={() => {
          setFormState((prev) => ({
            showForm: !prev.showForm,
            name: '',
            editingId: null,
            color: '#84CC16',
            description: ''
          }))
        }}
      />

      <TagFormCard
        showForm={showForm}
        formState={formState}
        setFormState={setFormState}
        colorPalette={COLOR_PALETTE}
        onSubmit={editingId ? handleUpdate : handleCreate}
      />

      {/* Error inline */}
      {loadError && (
        <div className="p-4 rounded border border-[var(--danger)]/50 bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-between text-xs font-mono">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={async () => {
              await loadTagsPage(pagination.currentPage, search)
            }}
            className="btn-outline btn-sm text-[var(--danger)]"
          >
            Reintentar
          </button>
        </div>
      )}

      <TagSearchCard
        search={search}
        onSearchChange={(nextSearch) => setListState((prev) => ({ ...prev, search: nextSearch }))}
        onSearch={() => loadTagsPage(1, search)}
        onClear={() => {
          setListState((prev) => ({ ...prev, search: '' }))
          loadTagsPage(1, '')
        }}
      />

      <TagsListSection
        pageLoading={pageLoading}
        mutationLoading={mutationLoading}
        tags={tags}
        pagination={pagination}
        search={search}
        onEdit={startEdit}
        onDelete={handleDelete}
        onPageChange={loadTagsPage}
      />
    </div>
  )
}

export default Tags
