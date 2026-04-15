import { useEffect, useState } from 'react'
import useTagStore from '../stores/tagStore'
import { useLinkStore } from '../stores/linkStore'
import { toast } from 'react-hot-toast'
import { Plus, X } from 'lucide-react'
import TagCard from '../components/TagCard'
import TagCardSkeleton from '../components/Skeletons/TagCardSkeleton'
import TagService from '../services/tagService'

const Tags = () => {
	const { isLoading: mutationLoading, createTag, updateTag, deleteTag } = useTagStore()
	const { refetchLinks, invalidateLinksByTags } = useLinkStore()
	const [listState, setListState] = useState({
		tags: [],
		pagination: {
		currentPage: 1,
		totalPages: 1,
		totalTags: 0,
		itemsPerPage: 5,
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
		color: '#6B7280',
		description: ''
	})
	const { tags, pagination, loadError, search, pageLoading } = listState
	const { showForm, name, editingId, color, description } = formState

	const loadTagsPage = async (page = 1, nextSearch = search) => {
		setListState((prev) => ({ ...prev, pageLoading: true }))
		try {
			const res = await TagService.getTagsPage({ page, limit: 5, search: nextSearch })
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
			const payload = { name: name.trim(), color: color || '#6B7280', description: description || '' }
			const res = await createTag(payload)
			if (res.success) {
				setFormState({
					showForm: false,
					name: '',
					editingId: null,
					color: '#6B7280',
					description: ''
				})
				setListState((prev) => ({ ...prev, loadError: '', search: '' }))
				await loadTagsPage(1, '')
				await invalidateLinksByTags() // Actualiza links que usan estas etiquetas
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
				await invalidateLinksByTags() // Actualiza links que ya no usan esta etiqueta
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
			color: tag.color || '#6B7280',
			description: tag.description || ''
		})
	}

	const handleUpdate = async (e) => {
		e.preventDefault()
		if (!name.trim()) return toast.error('Ingresa un nombre')
		try {
			const payload = { name: name.trim(), color: color || '#6B7280', description: description || '' }
			const res = await updateTag(editingId, payload)
			if (res.success) {
				setFormState({
					showForm: false,
					name: '',
					editingId: null,
					color: '#6B7280',
					description: ''
				})
				await loadTagsPage(pagination.currentPage, search)
				await invalidateLinksByTags() // Actualiza links que usan esta etiqueta modificada
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
		'#84CC16', // lime
		'#10B981', // green
		'#06B6D4', // cyan
		'#3B82F6', // blue
		'#7C3AED', // purple
		'#EC4899', // pink
		'#6B7280'  // gray (default)
	]

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Etiquetas</h1>
					<p className="text-gray-600 dark:text-gray-300">Organiza y administra tus etiquetas</p>
				</div>

				<div className="flex items-center gap-2">
					<button
							onClick={() => {
								setFormState((prev) => ({
									showForm: !prev.showForm,
									name: '',
									editingId: null,
									color: '#6B7280',
									description: ''
								}))
							}}
						className="btn-primary btn-md flex items-center"
					>
						<Plus className="w-4 h-4 mr-2" />
						{showForm ? 'Cancelar' : 'Nueva etiqueta'}
					</button>
				</div>
			</div>

			{showForm && (
				<div className="card">
					<div className="card-content">
						<form onSubmit={editingId ? handleUpdate : handleCreate} className="flex flex-col sm:flex-row gap-2 items-start">
							<div className="flex-1 w-full">
								<input
									className="input w-full"
									placeholder="Nombre de la etiqueta"
									value={name}
									onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
								/>
								<textarea
									className="input w-full mt-2"
									placeholder="Descripción (opcional)"
									value={description}
									onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
									rows={2}
								/>
								<div className="mt-2 flex items-center gap-3">
									<div className="text-sm text-gray-600 dark:text-gray-400">Color:</div>
									<div className="flex gap-2">
										{COLOR_PALETTE.map(c => (
											<button
												key={c}
												type="button"
												onClick={() => setFormState((prev) => ({ ...prev, color: c }))}
												className={`w-7 h-7 rounded-full border-2 ${color === c ? 'ring-2 ring-offset-1 ring-primary-500' : 'border-gray-300 dark:border-gray-600'}`}
												style={{ backgroundColor: c }}
											/>
										))}
									</div>
									<input type="color" value={color} onChange={(e) => setFormState((prev) => ({ ...prev, color: e.target.value }))} className="ml-2 h-8 w-10 p-0 rounded border border-gray-300 dark:border-gray-600" />
								</div>
							</div>
							<div className="flex-shrink-0 self-stretch flex items-center">
								<button className="btn-primary btn-md" type="submit">
									{editingId ? 'Guardar' : 'Crear'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Error inline */}
			{loadError && (
				<div className="card border-red-300 dark:border-red-800">
					<div className="card-content flex items-center justify-between">
						<p className="text-red-700 dark:text-red-400">{loadError}</p>
						<button
							onClick={async () => {
								await loadTagsPage(pagination.currentPage, search)
							}}
							className="btn-outline btn-sm"
						>
							Reintentar
						</button>
					</div>
				</div>
			)}

			<div className="card">
				<div className="card-content flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div className="flex-1 max-w-md">
						<label htmlFor="tag-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Buscar etiquetas</label>
						<input
							id="tag-search"
							className="input w-full"
							placeholder="Buscar por nombre"
							value={search}
							onChange={(e) => setListState((prev) => ({ ...prev, search: e.target.value }))}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									loadTagsPage(1, search)
								}
							}}
						/>
					</div>
					<div className="flex items-center gap-2">
						<button className="btn-outline btn-sm" type="button" onClick={() => loadTagsPage(1, search)}>
							Buscar
						</button>
						{search ? (
							<button
								type="button"
								onClick={() => {
									setListState((prev) => ({ ...prev, search: '' }))
									loadTagsPage(1, '')
								}}
								className="btn-outline btn-sm flex items-center gap-1"
							>
								<X className="w-4 h-4" />
								Limpiar
							</button>
						) : null}
					</div>
				</div>
			</div>

			{/* Lista */}
			{pageLoading || mutationLoading ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<TagCardSkeleton key={i} />
					))}
				</div>
			) : !tags || tags.length === 0 ? (
				<div className="text-center py-12">
					<p className="text-gray-600 dark:text-gray-400">Aún no hay etiquetas. Crea la primera.</p>
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
						{tags?.map((tag) => (
							<TagCard key={tag._id} tag={tag} onEdit={startEdit} onDelete={handleDelete} />
						))}
					</div>
					<div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Mostrando página <span className="font-medium">{pagination.currentPage}</span> de{' '}
							<span className="font-medium">{pagination.totalPages}</span> ({pagination.totalTags} etiquetas)
						</p>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => loadTagsPage(pagination.currentPage - 1, search)}
								disabled={!pagination.hasPrevPage || pageLoading}
								className="btn-outline btn-sm disabled:opacity-50"
							>
								Anterior
							</button>
							<button
								type="button"
								onClick={() => loadTagsPage(pagination.currentPage + 1, search)}
								disabled={!pagination.hasNextPage || pageLoading}
								className="btn-outline btn-sm disabled:opacity-50"
							>
								Siguiente
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	)
}

export default Tags

